import { useState } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Service {
  id: string;
  code: string;
  name: string;
  durationMin: number;
  defaultPrice: number;
  description?: string;
  isActive: boolean;
}

export default function ServicesListPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", durationMin: 30, defaultPrice: 0, description: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await api.get("/services");
      return (data as any).data as Service[];
    },
  });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post("/services", { ...body, defaultPrice: Number(body.defaultPrice) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setForm({ code: "", name: "", durationMin: 30, defaultPrice: 0, description: "" }); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Service> }) => api.patch(`/services/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setEditingId(null); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ code: s.code, name: s.name, durationMin: s.durationMin, defaultPrice: Number(s.defaultPrice), description: s.description ?? "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (editingId) {
      updateMut.mutate({ id: editingId, body: { name: form.name, durationMin: Number(form.durationMin), defaultPrice: Number(form.defaultPrice), description: form.description || undefined } });
    } else {
      if (!form.code) { setError("El codigo es requerido"); return; }
      createMut.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Servicios</h2>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="grid grid-cols-5 gap-3 items-end">
          <div>
            <label className="label text-xs">Codigo</label>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GEN-CONSULT" disabled={!!editingId} required />
          </div>
          <div>
            <label className="label text-xs">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label text-xs">Duracion (min)</label>
            <input type="number" className="input" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} required />
          </div>
          <div>
            <label className="label text-xs">Precio</label>
            <input type="number" className="input" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: Number(e.target.value) })} required />
          </div>
          <button type="submit" className="btn-primary">
            {editingId ? "Actualizar" : "Agregar"}
          </button>
        </form>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Duracion</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Cargando...</td></tr>
            ) : data?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Sin servicios</td></tr>
            ) : (
              data?.map((s) => (
                <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{s.code}</td>
                  <td className="px-4 py-3 text-ink-600">{s.name}</td>
                  <td className="px-4 py-3 text-ink-600">{s.durationMin} min</td>
                  <td className="px-4 py-3 text-ink-600">${Number(s.defaultPrice).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateMut.mutate({ id: s.id, body: { isActive: !s.isActive } })}
                      className={`badge ${s.isActive ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"}`}
                    >
                      {s.isActive ? "Si" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(s)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">Editar</button>
                    <button onClick={() => { if (confirm("Eliminar servicio?")) deleteMut.mutate(s.id); }} className="text-danger-600 hover:text-danger-800 text-sm font-medium">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
