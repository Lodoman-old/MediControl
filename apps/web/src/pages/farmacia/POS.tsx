import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

interface Medication { id: string; name: string; sku: string; barcode?: string; price: number; requiresPrescription: boolean; }
interface Batch { id: string; batchNumber: string; currentStock: number; medicationId: string; expiryDate: string; }
interface Branch { id: string; name: string; }

async function fetchMeds(): Promise<Medication[]> { const { data } = await api.get<Medication[]>("/pharmacy/medications?active=true"); return data; }
async function fetchBatches(): Promise<Batch[]> { const { data } = await api.get<Batch[]>("/pharmacy/batches"); return data; }
async function fetchBranches(): Promise<Branch[]> { const { data } = await api.get<{ data: Branch[] }>("/admin/branches"); return data.data ?? data; }
async function fetchPatients(): Promise<Array<{ id: string; person?: { fullName?: string }; mrn: string }>> { const { data } = await api.get<{ data: Array<{ id: string; person?: { fullName?: string }; mrn: string }> }>("/patients"); return data.data ?? data; }
async function fetchPrescription(id: string): Promise<{ id: string; patientId: string; medication: string; dosage: string; quantity: number | null; status: string; patient: { person: { firstName: string; lastNameP: string; lastNameM?: string } } }> { const { data } = await api.get(`/prescriptions/${id}`); return data; }

const BILLS = [20, 50, 100, 200, 500, 1000];

export default function POSPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prescriptionId = searchParams.get("prescriptionId") || undefined;

  const [branchId, setBranchId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [method, setMethod] = useState("CASH");
  const [cart, setCart] = useState<Array<{ medId: string; batchId: string; qty: number; price: number; name: string; prescriptionId?: string }>>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [scanBuffer, setScanBuffer] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: meds } = useQuery({ queryKey: ["pharmacy", "medications"], queryFn: fetchMeds });
  const { data: batches } = useQuery({ queryKey: ["pharmacy", "batches"], queryFn: fetchBatches });
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });
  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: fetchPatients });

  const { data: prescription, isLoading: loadingRx } = useQuery({
    queryKey: ["prescription", prescriptionId],
    queryFn: () => fetchPrescription(prescriptionId!),
    enabled: !!prescriptionId,
  });

  useEffect(() => {
    if (prescription?.patientId) {
      setPatientId(prescription.patientId);
    }
  }, [prescription]);

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(subtotal * 0.16 * 100) / 100;
  const total = subtotal + tax;
  const received = parseFloat(cashReceived) || 0;
  const change = received - total;
  const isCash = method === "CASH";

  const filteredMeds = (meds ?? []).filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.sku.toLowerCase().includes(search.toLowerCase()) ||
    (m.barcode && m.barcode.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 10);

  const quickMeds = useMemo(() => {
    return (meds ?? []).slice(0, 8);
  }, [meds]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) {
      const med = filteredMeds[0];
      if (med) { addToCart(med.id); setSearch(""); setShowResults(false); }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const prev = scanBuffer;

    if (scanTimer.current) clearTimeout(scanTimer.current);

    if (prev && val.length > prev.length && val.startsWith(prev)) {
      setScanBuffer(val);
      scanTimer.current = setTimeout(() => {
        const match = (meds ?? []).find(m =>
          m.sku.toLowerCase() === val.trim().toLowerCase() ||
          (m.barcode && m.barcode.toLowerCase() === val.trim().toLowerCase())
        );
        if (match) { addToCart(match.id); setSearch(""); setShowResults(false); }
        setScanBuffer("");
      }, 80);
    } else {
      setScanBuffer(val);
      scanTimer.current = setTimeout(() => setScanBuffer(""), 200);
    }

    setSearch(val);
    setShowResults(true);
  };

  const mutation = useMutation({
    mutationFn: (body: { branchId: string; patientId?: string; method: string; items: Array<Record<string, unknown>> }) => api.post("/pharmacy/sales", body).then(r => r.data),
    onSuccess: () => navigate(prescriptionId ? "/expediente" : "/farmacia"),
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const addToCart = (medId: string) => {
    const med = meds?.find(m => m.id === medId);
    if (!med) return;
    const batch = batches?.find(b => b.medicationId === medId && b.currentStock > 0);
    if (!batch) { setError("Sin stock disponible"); return; }
    setCart(prev => [...prev, { medId, batchId: batch.id, qty: 1, price: Number(med.price), name: med.name, prescriptionId }]);
    setError("");
    searchRef.current?.focus();
  };

  const removeFromCart = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || cart.length === 0) { setError("Completa sucursal y agrega items"); return; }
    if (isCash && received < total) { setError("El efectivo recibido es insuficiente"); return; }
    mutation.mutate({
      branchId, patientId: patientId || undefined, method,
      items: cart.map(i => ({
        medicationId: i.medId, batchId: i.batchId, quantity: i.qty, unitPrice: i.price,
        ...(i.prescriptionId ? { prescriptionId: i.prescriptionId } : {}),
      })),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Punto de Venta</h2>
        <button onClick={() => navigate(prescriptionId ? "/expediente" : "/farmacia")} className="text-sm text-ink-500 hover:text-ink-700">Volver</button>
      </div>

      {prescriptionId && (
        <div className="p-3 bg-info-50 border border-info-200 rounded-lg">
          {loadingRx ? (
            <p className="text-sm text-info-700">Cargando receta...</p>
          ) : prescription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-info-900">
                  Despachando receta: <span className="font-bold">{prescription.medication} {prescription.dosage}</span>
                </p>
                <p className="text-xs text-info-600">
                  Paciente: {prescription.patient?.person ? `${prescription.patient.person.firstName} ${prescription.patient.person.lastNameP}` : "N/A"} &middot;
                  Cantidad prescrita: {prescription.quantity ?? "N/A"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/farmacia/pos")}
                className="text-xs text-danger-600 hover:text-danger-800"
              >
                Cancelar despacho
              </button>
            </div>
          ) : (
            <p className="text-sm text-danger-700">Receta no encontrada</p>
          )}
        </div>
      )}

      {error && <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Sucursal</label>
                  <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input" required>
                    <option value="">Seleccionar...</option>{(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div><label className="label">Metodo de pago</label>
                  <select value={method} onChange={e => setMethod(e.target.value)} className="input">
                    <option value="CASH">Efectivo</option><option value="POS">Terminal</option><option value="SPEI">SPEI</option><option value="TRANSFER">Transferencia</option>
                  </select>
                </div>
                <div><label className="label">Paciente</label>
                  <select value={patientId} onChange={e => setPatientId(e.target.value)} className="input" disabled={!!prescriptionId}>
                    <option value="">{prescriptionId ? "Pre-seleccionado" : "Publico general"}</option>
                    {(patients ?? []).map(p => <option key={p.id} value={p.id}>{p.person?.fullName ?? p.mrn}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="card space-y-3">
              <div>
                <label className="label">Buscar medicamento (codigo de barras / nombre / SKU)</label>
                <input
                  ref={searchRef}
                  type="text"
                  className="input w-full"
                  placeholder="Escanea codigo de barras o escribe para buscar..."
                  value={search}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  autoFocus
                />
                {showResults && search.trim() && (
                  <div className="mt-1 border border-ink-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                    {filteredMeds.length === 0 ? (
                      <p className="p-3 text-sm text-ink-500">Sin resultados</p>
                    ) : filteredMeds.map(m => {
                      const batch = batches?.find(b => b.medicationId === m.id && b.currentStock > 0);
                      const inCart = cart.some(c => c.medId === m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onMouseDown={() => { addToCart(m.id); setSearch(""); setShowResults(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-ink-50 flex items-center justify-between border-b border-ink-50 last:border-0"
                        >
                          <div>
                            <span className="font-medium text-ink-900">{m.name}</span>
                            <span className="text-xs text-ink-400 ml-2 font-mono">{m.sku}</span>
                            <span className="text-xs text-ink-500 ml-2">${Number(m.price).toLocaleString("es-MX")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {!batch && <span className="text-danger-600">Sin stock</span>}
                            {batch && <span className="text-ink-400">Stock: {batch.currentStock}</span>}
                            {inCart && <span className="badge bg-primary-100 text-primary-700">En carrito</span>}
                            {m.requiresPrescription && <span className="badge bg-yellow-100 text-yellow-700">Rx</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-ink-500 mb-2">Productos frecuentes</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {quickMeds.map(m => {
                    const batch = batches?.find(b => b.medicationId === m.id && b.currentStock > 0);
                    const inCart = cart.some(c => c.medId === m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => addToCart(m.id)}
                        disabled={!batch}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          !batch
                            ? "bg-ink-50 text-ink-400 cursor-not-allowed border-ink-100"
                            : inCart
                              ? "bg-primary-50 border-primary-300 text-primary-700"
                              : "bg-white border-ink-200 text-ink-700 hover:border-primary-300 hover:bg-primary-50"
                        }`}
                      >
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          ${Number(m.price).toLocaleString("es-MX")}
                          {m.requiresPrescription && <span className="ml-1 text-yellow-600">Rx</span>}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-ink-50 text-ink-600 text-left">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Cant</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Rx</th>
                    <th className="px-4 py-3"></th>
                  </tr></thead>
                  <tbody>{cart.map((item, i) => (
                    <tr key={i} className="border-t border-ink-100 hover:bg-ink-50">
                      <td className="px-4 py-3 text-ink-900">{item.name}</td>
                      <td className="px-4 py-3">
                        <input type="number" min="1" value={item.qty}
                          onChange={e => { const q = parseInt(e.target.value) || 1; setCart(prev => prev.map((c, j) => j === i ? { ...c, qty: q } : c)); }}
                          className="input w-16 text-center" />
                      </td>
                      <td className="px-4 py-3 text-ink-900">${item.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-ink-900 font-mono">${(item.qty * item.price).toFixed(2)}</td>
                      <td className="px-4 py-3">{item.prescriptionId ? <span className="badge bg-info-100 text-info-700 text-xs">Rx</span> : <span className="text-ink-400 text-xs">--</span>}</td>
                      <td className="px-4 py-3"><button type="button" onClick={() => removeFromCart(i)} className="text-danger-600 text-xs hover:text-danger-800">Quitar</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card bg-ink-50">
              <h3 className="text-sm font-semibold text-ink-700 mb-3">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-ink-500">IVA 16%</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t border-ink-200 pt-2 mt-2">
                  <span>Total</span>
                  <span className={cart.length > 0 ? "text-primary-700" : ""}>${total.toFixed(2)} MXN</span>
                </div>
              </div>
            </div>

            {isCash && cart.length > 0 && (
              <div className="card space-y-3">
                <h3 className="text-sm font-semibold text-ink-700">Pago en efectivo</h3>

                <div>
                  <label className="label">Recibido</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-lg font-mono"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                  />
                </div>

                <div>
                  <p className="text-xs text-ink-500 mb-1.5">Billetes rapidos</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BILLS.map(bill => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashReceived(String(bill))}
                        className={`px-2 py-1.5 text-sm font-mono rounded border transition-colors ${
                          received === bill
                            ? "bg-success-100 border-success-300 text-success-700"
                            : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        ${bill}
                      </button>
                    ))}
                  </div>
                </div>

                {received > 0 && (
                  <div className={`p-3 rounded-lg text-center text-lg font-bold ${
                    change >= 0
                      ? "bg-success-50 text-success-700 border border-success-200"
                      : "bg-danger-50 text-danger-700 border border-danger-200"
                  }`}>
                    {change >= 0
                      ? `Cambio: $${change.toFixed(2)}`
                      : `Faltan: $${Math.abs(change).toFixed(2)}`
                    }
                  </div>
                )}
              </div>
            )}

            {cart.length > 0 && (
              <button
                type="submit"
                disabled={mutation.isPending || (isCash && received < total)}
                className="btn-primary w-full py-3 text-lg"
              >
                {mutation.isPending
                  ? "Procesando..."
                  : isCash
                    ? `Cobrar $${total.toFixed(2)}`
                    : `Cobrar $${total.toFixed(2)}`
                }
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
