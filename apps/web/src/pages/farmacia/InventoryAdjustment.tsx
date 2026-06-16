import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

export default function InventoryAdjustmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [medId, setMedId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { data: meds } = useQuery({
    queryKey: ["pharmacy", "medications"],
    queryFn: () => api.get("/pharmacy/medications?active=true").then(r => r.data),
  });

  const { data: batches } = useQuery({
    queryKey: ["pharmacy", "batches"],
    queryFn: () => api.get("/pharmacy/batches").then(r => r.data),
    enabled: !!medId,
  });

  const filteredBatches = (batches ?? []).filter((b: any) => b.medicationId === medId);

  const mutation = useMutation({
    mutationFn: (body: any) => api.post("/pharmacy/movements", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy"] });
      setSuccess("Stock ajustado correctamente");
      setBatchId("");
      setQuantity("");
      setReason("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!batchId || !quantity) { setError("Selecciona lote y cantidad"); return; }
    mutation.mutate({ batchId, type, quantity: parseInt(quantity), reason: reason || undefined });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Ajuste de inventario</h2>
        <button onClick={() => navigate("/farmacia")} className="text-sm text-ink-500 hover:text-ink-700">Volver a farmacia</button>
      </div>

      {error && <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>}
      {success && <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700">{success}</div>}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Medicamento</label>
          <select className="input" value={medId} onChange={e => { setMedId(e.target.value); setBatchId(""); }}>
            <option value="">Seleccionar...</option>
            {(meds ?? []).map((m: any) => (
              <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Lote</label>
          <select className="input" value={batchId} onChange={e => setBatchId(e.target.value)} disabled={!medId}>
            <option value="">Seleccionar...</option>
            {filteredBatches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — Stock: {b.currentStock} — Cad: {b.expiryDate?.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de movimiento</label>
            <select className="input" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="IN">Entrada</option>
              <option value="OUT">Salida</option>
              <option value="ADJUSTMENT">Ajuste (stock exacto)</option>
            </select>
          </div>
          <div>
            <label className="label">
              {type === "ADJUSTMENT" ? "Stock final" : "Cantidad"}
            </label>
            <input type="number" min="1" className="input" value={quantity}
              onChange={e => setQuantity(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label">Motivo (opcional)</label>
          <input className="input" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Ej: Merma, devolucion, ajuste fisico" />
        </div>

        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? "Ajustando..." : "Aplicar ajuste"}
        </button>
      </form>
    </div>
  );
}
