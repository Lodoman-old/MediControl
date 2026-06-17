import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api";
import { methodLabel } from "@/lib/roles";

interface Sale {
  id: string; total: number; method: string; status: string;
  paymentReference: string | null; createdAt: string;
  patient?: { person?: { fullName?: string } };
  items: Array<{ medication: { name: string }; quantity: number; totalPrice: number }>;
}

async function fetchSales(): Promise<Sale[]> {
  const { data } = await api.get<Sale[]>("/pharmacy/sales");
  return data;
}

export default function SalesHistoryPage() {
  const navigate = useNavigate();
  const { data: sales, isLoading } = useQuery({ queryKey: ["pharmacy", "sales"], queryFn: fetchSales });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Historial de ventas</h2>
        <button onClick={() => navigate("/farmacia")} className="text-sm text-ink-500 hover:text-ink-700">Volver a farmacia</button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-ink-50 text-ink-600 text-left">
            <th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Items</th><th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Metodo</th><th className="px-4 py-3 font-medium">Ref</th>
          </tr></thead>
          <tbody>{isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Cargando...</td></tr>
            : !sales?.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Sin ventas</td></tr>
            : sales.map(s => <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50">
              <td className="px-4 py-3">{format(parseISO(s.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</td>
              <td className="px-4 py-3 font-medium">{s.patient?.person?.fullName ?? "Publico general"}</td>
              <td className="px-4 py-3">{s.items.reduce((a, i) => a + i.quantity, 0)}</td>
              <td className="px-4 py-3 font-mono">${Number(s.total).toLocaleString("es-MX")}</td>
              <td className="px-4 py-3"><span className="badge bg-blue-100 text-blue-700">{methodLabel(s.method)}</span></td>
              <td className="px-4 py-3 text-xs font-mono text-ink-500">{s.paymentReference ?? "—"}</td>
            </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
