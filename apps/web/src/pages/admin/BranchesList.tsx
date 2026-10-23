import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

interface ServiceLocation {
  id: string;
  code: string;
  name: string;
  locationType: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  address: Record<string, unknown> | null;
  phone: string | null;
  cofeprisLicense: string | null;
  isActive: boolean;
  serviceLocations: ServiceLocation[];
  _count?: { appointments: number };
}

const EMPTY_FORM = {
  code: "",
  name: "",
  phone: "",
  cofeprisLicense: "",
  street: "",
  colonia: "",
  ciudad: "",
  estado: "",
  cp: "",
  isActive: true,
};

type BranchForm = typeof EMPTY_FORM;

function toForm(branch: Branch): BranchForm {
  const a = (branch.address ?? {}) as Record<string, string>;
  return {
    code: branch.code,
    name: branch.name,
    phone: branch.phone ?? "",
    cofeprisLicense: branch.cofeprisLicense ?? "",
    street: a.street ?? "",
    colonia: a.colonia ?? "",
    ciudad: a.ciudad ?? "",
    estado: a.estado ?? "",
    cp: a.cp ?? "",
    isActive: branch.isActive,
  };
}

export default function BranchesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get("/admin/branches");
      return (data?.data ?? data ?? []) as Branch[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["branches"] });
    qc.invalidateQueries({ queryKey: ["service-locations"] });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const createMut = useMutation({
    mutationFn: (body: BranchForm) => api.post("/admin/branches", body),
    onSuccess: () => { invalidate(); resetForm(); setError(null); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: BranchForm }) => api.patch(`/admin/branches/${id}`, body),
    onSuccess: () => { invalidate(); resetForm(); setError(null); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/branches/${id}`),
    onSuccess: () => { invalidate(); setError(null); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.code.trim() || !form.name.trim()) {
      setError("Codigo y nombre son requeridos");
      return;
    }
    const body: BranchForm = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      cofeprisLicense: form.cofeprisLicense.trim(),
      street: form.street.trim(),
      colonia: form.colonia.trim(),
      ciudad: form.ciudad.trim(),
      estado: form.estado.trim(),
      cp: form.cp.trim(),
    };
    if (editingId) updateMut.mutate({ id: editingId, body });
    else createMut.mutate(body);
  };

  const startEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setForm(toForm(branch));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = <K extends keyof BranchForm>(key: K, value: BranchForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-ink-900">Sucursales</h2>
          <p className="text-sm text-ink-500 mt-1">
            Cada sucursal es una direccion fisica. Dentro de cada una se crean los consultorios.
          </p>
        </div>
        {editingId && (
          <button onClick={resetForm} className="btn-secondary text-sm">Cancelar edicion</button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="card">
        <h3 className="font-medium text-ink-900 mb-3">
          {editingId ? "Editar sucursal" : "Nueva sucursal"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Codigo *</label>
              <input className="input" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="CENTRO" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">Nombre *</label>
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Sucursal Centro" required />
            </div>
            <div>
              <label className="label text-xs">Telefono</label>
              <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+5255..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Calle y numero</label>
              <input className="input" value={form.street} onChange={(e) => set("street", e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Colonia</label>
              <input className="input" value={form.colonia} onChange={(e) => set("colonia", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="label text-xs">Ciudad / Municipio</label>
              <input className="input" value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Estado</label>
              <input className="input" value={form.estado} onChange={(e) => set("estado", e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Codigo postal</label>
              <input className="input" value={form.cp} onChange={(e) => set("cp", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="label text-xs">Licencia COFEPRIS</label>
              <input className="input" value={form.cofeprisLicense} onChange={(e) => set("cofeprisLicense", e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Activa
              </label>
              <button type="submit" className="btn-primary ml-auto" disabled={createMut.isPending || updateMut.isPending}>
                {editingId ? "Guardar cambios" : "Crear sucursal"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Consultorios</th>
              <th className="px-4 py-3 font-medium">Activa</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">Cargando...</td></tr>
            ) : (branches?.length ?? 0) === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">Sin sucursales</td></tr>
            ) : (
              branches?.map((b) => {
                const addr = (b.address ?? {}) as Record<string, string>;
                return (
                  <tr key={b.id} className="border-t border-ink-100 hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-900">{b.code}</td>
                    <td className="px-4 py-3 text-ink-700">{b.name}</td>
                    <td className="px-4 py-3 text-ink-600">{addr.ciudad || "—"}</td>
                    <td className="px-4 py-3 text-ink-600">{b.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/ubicaciones?branchId=${b.id}`)}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                        title="Ver consultorios de esta sucursal"
                      >
                        {b.serviceLocations?.length ?? 0} consultorio(s)
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateMut.mutate({ id: b.id, body: { ...toForm(b), isActive: !b.isActive } })}
                        className={`badge ${b.isActive ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-500"}`}
                      >
                        {b.isActive ? "Si" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(b)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">Editar</button>
                        <button
                          onClick={() => { if (confirm(`Eliminar la sucursal "${b.name}"?`)) deleteMut.mutate(b.id); }}
                          className="text-danger-600 hover:text-danger-800 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
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
