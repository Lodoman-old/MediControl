import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

interface Patient {
  id: string;
  mrn: string;
  person?: { fullName?: string };
}

interface Branch {
  id: string;
  name: string;
}

async function fetchPatients(): Promise<Patient[]> {
  const { data } = await api.get<{ data: Patient[] }>("/patients");
  return data.data ?? data;
}

async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<{ data: Branch[] }>("/admin/branches");
  return data.data ?? data;
}

async function createPayment(body: {
  branchId: string;
  patientId: string;
  amount: number;
  method: string;
  currency?: string;
  notes?: string;
}) {
  const { data } = await api.post("/payments", body);
  return data;
}

const METHODS = [
  { value: "CASH", label: "Efectivo" },
  { value: "POS", label: "Terminal" },
  { value: "SPEI", label: "Transferencia SPEI" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Otro" },
];

export default function NewPaymentPage() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: patients } = useQuery({ queryKey: ["patients"], queryFn: fetchPatients });
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      navigate("/pagos");
    },
    onError: (err) => {
      setError(extractErrorMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!branchId || !patientId || !amount) {
      setError("Completa todos los campos requeridos");
      return;
    }
    mutation.mutate({
      branchId,
      patientId,
      amount: parseFloat(amount),
      method,
      notes: notes || undefined,
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Nuevo pago</h2>
        <button onClick={() => navigate("/pagos")} className="text-sm text-ink-500 hover:text-ink-700">
          Volver
        </button>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Sucursal</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input" required>
            <option value="">Seleccionar...</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Paciente</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="input" required>
            <option value="">Seleccionar...</option>
            {(patients ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.person?.fullName ?? p.mrn}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Monto</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="label">Metodo de pago</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Registrando..." : "Registrar pago"}
          </button>
          <button type="button" onClick={() => navigate("/pagos")} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
