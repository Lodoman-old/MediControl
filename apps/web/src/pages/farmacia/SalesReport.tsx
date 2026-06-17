import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api";
import { methodLabel } from "@/lib/roles";

interface SaleItem {
  medication: { name: string };
  quantity: number;
  totalPrice: number;
}

interface Sale {
  id: string;
  total: number;
  method: string;
  createdAt: string;
  patient?: { person?: { fullName?: string } };
  createdBy?: { id: string; email: string; person?: { firstName: string; lastNameP: string } };
  items: SaleItem[];
}

interface UserSummary {
  userId: string;
  userName: string;
  totalSales: number;
  totalAmount: number;
}

export default function SalesReportPage() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState("");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["pharmacy", "sales", selectedUser],
    queryFn: () => api.get<Sale[]>("/pharmacy/sales", { params: selectedUser ? { userId: selectedUser } : {} }).then(r => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ["admin", "users", "sellers"],
    queryFn: () => api.get("/admin/users?limit=100&role=DOCTOR").then(r => r.data?.data ?? []),
  });

  const userSummaries = useMemo(() => {
    if (!sales) return [];
    const map = new Map<string, UserSummary>();
    for (const s of sales) {
      const uid = s.createdBy?.id ?? "unknown";
      const existing = map.get(uid) ?? {
        userId: uid,
        userName: s.createdBy?.person
          ? `${s.createdBy.person.firstName} ${s.createdBy.person.lastNameP}`
          : s.createdBy?.email ?? "Desconocido",
        totalSales: 0,
        totalAmount: 0,
      };
      existing.totalSales++;
      existing.totalAmount += Number(s.total);
      map.set(uid, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [sales]);

  const totalVentas = sales?.reduce((s, x) => s + Number(x.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Reporte de ventas</h2>
        <button onClick={() => navigate("/farmacia")} className="text-sm text-ink-500 hover:text-ink-700">Volver</button>
      </div>

      <div className="card">
        <label className="label">Filtrar por usuario</label>
        <select className="input max-w-sm" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
          <option value="">Todos los usuarios</option>
          {(users ?? []).map((u: any) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-ink-500">Total ventas</p>
          <p className="text-2xl font-bold text-ink-900">{sales?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-ink-500">Monto total</p>
          <p className="text-2xl font-bold text-primary-600">${totalVentas.toLocaleString("es-MX")}</p>
        </div>
        <div className="card">
          <p className="text-sm text-ink-500">Vendedores</p>
          <p className="text-2xl font-bold text-ink-900">{userSummaries.length}</p>
        </div>
      </div>

      {userSummaries.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-ink-700 mb-3">Resumen por vendedor</h3>
          <div className="space-y-2">
            {userSummaries.map(u => (
              <div key={u.userId} className="flex items-center justify-between p-2 bg-ink-50 rounded-lg">
                <span className="font-medium text-ink-900">{u.userName}</span>
                <div className="text-sm text-right">
                  <span className="text-ink-500">{u.totalSales} ventas</span>
                  <span className="ml-3 font-mono font-semibold text-ink-900">${u.totalAmount.toLocaleString("es-MX")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-ink-50 text-ink-600 text-left">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Vendio</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Metodo</th>
          </tr></thead>
          <tbody>{isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Cargando...</td></tr>
            : !sales?.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Sin ventas</td></tr>
            : sales.map(s => (
              <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50">
                <td className="px-4 py-3">{format(parseISO(s.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</td>
                <td className="px-4 py-3 font-medium">{s.patient?.person?.fullName ?? "Publico general"}</td>
                <td className="px-4 py-3 text-ink-600">
                  {s.createdBy?.person
                    ? `${s.createdBy.person.firstName} ${s.createdBy.person.lastNameP}`
                    : s.createdBy?.email ?? "—"}
                </td>
                <td className="px-4 py-3">{s.items.reduce((a: number, i: SaleItem) => a + i.quantity, 0)}</td>
                <td className="px-4 py-3 font-mono">${Number(s.total).toLocaleString("es-MX")}</td>
                <td className="px-4 py-3"><span className="badge bg-blue-100 text-blue-700">{methodLabel(s.method)}</span></td>
              </tr>
            ))}</tbody>
        </table>
      </div>
    </div>
  );
}
