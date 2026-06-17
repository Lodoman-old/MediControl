import { useState } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Location {
  id: string;
  code: string;
  name: string;
  branchId: string;
  locationType: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
}

export default function LocationsListPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ branchId: "", code: "", name: "", locationType: "EXAM_ROOM" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: locations } = useQuery({
    queryKey: ["service-locations"],
    queryFn: async () => {
      const { data } = await api.get("/service-locations");
      return (data as any).data as Location[];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/admin/branches");
      return (data?.data ?? data ?? []) as Branch[];
    },
  });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post("/service-locations", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-locations"] }); resetForm(); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Location> }) => api.patch(`/service-locations/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-locations"] }); setEditingId(null); resetForm(); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/service-locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-locations"] }),
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const resetForm = () => setForm({ branchId: "", code: "", name: "", locationType: "EXAM_ROOM" });

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({ branchId: loc.branchId, code: loc.code, name: loc.name, locationType: loc.locationType });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (editingId) {
      updateMut.mutate({ id: editingId, body: { name: form.name, code: form.code, locationType: form.locationType } });
    } else {
      if (!form.branchId || !form.code) { setError("Sucursal y codigo requeridos"); return; }
      createMut.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Consultorios / Ubicaciones</h2>

      {error && <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg"><p className="text-sm text-danger-700">{error}</p></div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="grid grid-cols-5 gap-3 items-end">
          <div>
            <label className="label text-xs">Sucursal</label>
            <select className="input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
              <option value="">Seleccionar...</option>
              {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Codigo</label>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={!!editingId} required />
          </div>
          <div>
            <label className="label text-xs">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label text-xs">Tipo</label>
            <select className="input" value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value })}>
              <option value="EXAM_ROOM">Consultorio</option>
              <option value="OFFICE">Oficina</option>
              <option value="LAB">Laboratorio</option>
              <option value="EMERGENCY">Emergencia</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">{editingId ? "Actualizar" : "Agregar"}</button>
        </form>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Sucursal</th>
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {locations?.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">Sin ubicaciones</td></tr>
            ) : (
              locations?.map((loc) => {
                const branch = (branches ?? []).find((b) => b.id === loc.branchId);
                return (
                  <tr key={loc.id} className="border-t border-ink-100 hover:bg-ink-50">
                    <td className="px-4 py-3 text-ink-600">{branch?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{loc.code}</td>
                    <td className="px-4 py-3 text-ink-600">{loc.name}</td>
                    <td className="px-4 py-3 text-ink-600">{loc.locationType}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateMut.mutate({ id: loc.id, body: { isActive: !loc.isActive } })}
                        className={`badge ${loc.isActive ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"}`}
                      >
                        {loc.isActive ? "Si" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => startEdit(loc)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">Editar</button>
                      <button onClick={() => { if (confirm("Eliminar?")) deleteMut.mutate(loc.id); }} className="text-danger-600 hover:text-danger-800 text-sm font-medium">Eliminar</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
