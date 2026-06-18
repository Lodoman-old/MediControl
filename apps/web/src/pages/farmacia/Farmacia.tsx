import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

interface Medication {
  id: string; sku: string; barcode: string | null; name: string; presentation: string;
  activeIngredient: string | null; concentration: string | null;
  requiresPrescription: boolean; price: number; currency: string;
  isActive: boolean;
}

interface Branch {
  id: string; code: string; name: string;
}

interface Batch {
  id: string; batchNumber: string; expiryDate: string;
  initialStock: number; currentStock: number; costPrice: number | null;
  medication: { name: string };
  branch?: { id: string; name: string; code: string } | null;
}

async function fetchMeds(): Promise<Medication[]> {
  const { data } = await api.get<Medication[]>("/pharmacy/medications?active=true");
  return data;
}

async function fetchBatches(branchId?: string): Promise<Batch[]> {
  const params = branchId ? `?branchId=${branchId}` : "";
  const { data } = await api.get<Batch[]>(`/pharmacy/batches${params}`);
  return data;
}

async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<{ data: Branch[] }>("/admin/branches");
  return data.data ?? data;
}

async function createMedication(body: { sku: string; barcode?: string; name: string; presentation: string; price: number; requiresPrescription?: boolean; activeIngredient?: string; concentration?: string }) {
  const { data } = await api.post("/pharmacy/medications", body);
  return data;
}

async function createBatch(body: { medicationId: string; batchNumber: string; expiryDate: string; initialStock: number; costPrice?: number }) {
  const { data } = await api.post("/pharmacy/batches", body);
  return data;
}

export default function FarmaciaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPERADMIN");
  const [tab, setTab] = useState<"meds" | "batches">("meds");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState<string>(user?.branchId ?? "");

  // New medication form
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [pres, setPres] = useState("");
  const [price, setPrice] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [conc, setConc] = useState("");
  const [reqRx, setReqRx] = useState(false);

  // New batch form
  const [medId, setMedId] = useState("");
  const [batchNum, setBatchNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [initStock, setInitStock] = useState("");

  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });

  const { data: meds } = useQuery({ queryKey: ["pharmacy", "medications"], queryFn: fetchMeds });
  const { data: batches } = useQuery({ queryKey: ["pharmacy", "batches", branchId], queryFn: () => fetchBatches(branchId || undefined) });

  const createMed = useMutation({
    mutationFn: createMedication,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pharmacy", "medications"] }); setShowForm(false); resetForm(); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const createBch = useMutation({
    mutationFn: createBatch,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pharmacy", "batches"] }); setShowForm(false); resetForm(); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const resetForm = () => { setSku(""); setBarcode(""); setName(""); setPres(""); setPrice(""); setIngredient(""); setConc(""); setReqRx(false); setMedId(""); setBatchNum(""); setExpiry(""); setInitStock(""); setError(""); };

  const handleMedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMed.mutate({ sku, barcode: barcode || undefined, name, presentation: pres, price: parseFloat(price), requiresPrescription: reqRx, activeIngredient: ingredient || undefined, concentration: conc || undefined });
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBch.mutate({ medicationId: medId, batchNumber: batchNum, expiryDate: expiry, initialStock: parseInt(initStock) });
  };

  const filteredBatches = branchId ? (batches ?? []) : (batches ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Farmacia</h2>
        <div className="flex gap-3">
          {tab === "meds" && <button onClick={() => { setShowForm(!showForm); setError(""); }} className="btn-primary">{showForm ? "Cancelar" : "Nuevo medicamento"}</button>}
          {tab === "batches" && <button onClick={() => { setShowForm(!showForm); setError(""); }} className="btn-primary">{showForm ? "Cancelar" : "Nuevo lote"}</button>}
          <button onClick={() => navigate("/farmacia/pos")} className="btn-primary">POS / Vender</button>
          <button onClick={() => navigate("/farmacia/caja")} className="btn-secondary">Caja</button>
          <button onClick={() => navigate("/farmacia/reporte-ventas")} className="btn-secondary">Reporte ventas</button>
          <button onClick={() => navigate("/farmacia/ventas")} className="btn-secondary">Historial</button>
          <button onClick={() => navigate("/farmacia/ajustes")} className="btn-secondary">Ajustar stock</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 pb-2">
        <button onClick={() => { setTab("meds"); setShowForm(false); }} className={`px-3 py-1 text-sm font-medium rounded ${tab === "meds" ? "bg-primary-100 text-primary-700" : "text-ink-500"}`}>Medicamentos</button>
        <button onClick={() => { setTab("batches"); setShowForm(false); }} className={`px-3 py-1 text-sm font-medium rounded ${tab === "batches" ? "bg-primary-100 text-primary-700" : "text-ink-500"}`}>Inventario / Lotes</button>
        {tab === "batches" && branches && (
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input text-sm py-1 ml-auto max-w-xs">
            <option value="">Todas las sucursales</option>
            {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>}

      {showForm && tab === "meds" && (
        <form onSubmit={handleMedSubmit} className="card space-y-3 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">SKU</label><input value={sku} onChange={e => setSku(e.target.value)} className="input" required /></div>
            <div><label className="label">Codigo de barras</label><input value={barcode} onChange={e => setBarcode(e.target.value)} className="input" placeholder="EAN-13" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Precio</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="input" required /></div>
            <div><label className="label">Nombre</label><input value={name} onChange={e => setName(e.target.value)} className="input" required /></div>
          </div>
          <div><label className="label">Presentacion</label><input value={pres} onChange={e => setPres(e.target.value)} className="input" placeholder="Caja 20 tabletas" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Ingrediente activo</label><input value={ingredient} onChange={e => setIngredient(e.target.value)} className="input" /></div>
            <div><label className="label">Concentracion</label><input value={conc} onChange={e => setConc(e.target.value)} className="input" placeholder="500mg" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reqRx} onChange={e => setReqRx(e.target.checked)} className="rounded" /> Requiere receta</label>
          <button type="submit" disabled={createMed.isPending} className="btn-primary">{createMed.isPending ? "Guardando..." : "Guardar medicamento"}</button>
        </form>
      )}

      {showForm && tab === "batches" && (
        <form onSubmit={handleBatchSubmit} className="card space-y-3 max-w-lg">
          <div><label className="label">Medicamento</label>
            <select value={medId} onChange={e => setMedId(e.target.value)} className="input" required>
              <option value="">Seleccionar...</option>{(meds ?? []).map(m => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Numero de lote</label><input value={batchNum} onChange={e => setBatchNum(e.target.value)} className="input" required /></div>
            <div><label className="label">Stock inicial</label><input type="number" value={initStock} onChange={e => setInitStock(e.target.value)} className="input" required /></div>
          </div>
          <div><label className="label">Fecha de caducidad</label><input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="input" required /></div>
          <button type="submit" disabled={createBch.isPending} className="btn-primary">{createBch.isPending ? "Guardando..." : "Guardar lote"}</button>
        </form>
      )}

      {tab === "meds" && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Codigo barras</th><th className="px-4 py-3 font-medium">SKU</th><th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Presentacion</th><th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Rx</th>
            </tr></thead>
            <tbody>{(meds ?? []).map(m => <tr key={m.id} className="border-t border-ink-100 hover:bg-ink-50">
              <td className="px-4 py-3 font-mono text-xs text-ink-500">{m.barcode ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs">{m.sku}</td>
              <td className="px-4 py-3 font-medium">{m.name}</td>
              <td className="px-4 py-3 text-ink-600">{m.presentation}</td>
              <td className="px-4 py-3 font-mono">${Number(m.price).toLocaleString("es-MX")}</td>
              <td className="px-4 py-3">{m.requiresPrescription ? <span className="badge bg-yellow-100 text-yellow-700">Receta</span> : <span className="text-ink-400">Libre</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === "batches" && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Medicamento</th><th className="px-4 py-3 font-medium">Sucursal</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Caducidad</th><th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Costo</th>
            </tr></thead>
            <tbody>{(batches ?? []).map(b => <tr key={b.id} className="border-t border-ink-100 hover:bg-ink-50">
              <td className="px-4 py-3 font-medium">{b.medication.name}</td>
              <td className="px-4 py-3 text-xs text-ink-500">{b.branch?.name ?? "General"}</td>
              <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
              <td className="px-4 py-3">{b.expiryDate?.slice(0, 10)}</td>
              <td className="px-4 py-3"><span className={`font-semibold ${b.currentStock < 10 ? "text-danger-600" : "text-ink-900"}`}>{b.currentStock}</span></td>
              <td className="px-4 py-3">{b.costPrice ? `$${Number(b.costPrice).toLocaleString("es-MX")}` : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
