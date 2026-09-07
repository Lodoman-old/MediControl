import { useState } from "react";
import { api, extractErrorMessage } from "@/lib/api";

interface QuickPatientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (patient: { id: string; fullName: string; phone: string }) => void;
}

export default function QuickPatientModal({ open, onClose, onCreated }: QuickPatientModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastNameP, setLastNameP] = useState("");
  const [lastNameM, setLastNameM] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName || !lastNameP || !phone || !birthDate) {
      setError("Completa todos los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/patients/quick", {
        firstName,
        lastNameP,
        lastNameM: lastNameM || undefined,
        phone,
        birthDate,
        gender,
      });
      const fullName = data.fullName ?? `${firstName} ${lastNameP}${lastNameM ? " " + lastNameM : ""}`;
      onCreated({ id: data.id, fullName, phone });
      setFirstName("");
      setLastNameP("");
      setLastNameM("");
      setPhone("");
      setBirthDate("");
      setGender("M");
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">Crear paciente rapido</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Apellido paterno *</label>
              <input className="input" value={lastNameP} onChange={(e) => setLastNameP(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Apellido materno</label>
            <input className="input" value={lastNameM} onChange={(e) => setLastNameM(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono *</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52..." required />
            </div>
            <div>
              <label className="label">Fecha nacimiento *</label>
              <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Genero</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">Otro</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creando..." : "Crear paciente"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
