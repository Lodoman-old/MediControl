import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

interface OrganizationSettings {
  id: string;
  legalName: string;
  displayName: string | null;
  rfc: string;
  orgType: string;
  slug: string | null;
  timezone: string;
  fiscalAddress: Record<string, string> | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

interface IntegrationOption {
  provider: string;
  label: string;
  description: string;
  isEnabled: boolean;
  configured: boolean;
  config: Record<string, string>;
  secrets: string[];
  updatedAt: string | null;
}

interface SettingsResponse {
  organization: OrganizationSettings;
  integrations: IntegrationOption[];
}

const TIMEZONES = [
  "America/Mexico_City",
  "America/Cancun",
  "America/Monterrey",
  "America/Chihuahua",
  "America/Hermosillo",
  "America/Mazatlan",
  "America/Tijuana",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "UTC",
];

const FIELD_LABELS: Record<string, string> = {
  phoneNumberId: "Phone Number ID",
  apiToken: "API Token",
  host: "Servidor SMTP",
  port: "Puerto",
  secure: "Conexion segura (true/false)",
  user: "Usuario",
  pass: "Contrasena",
  from: "Remitente (from)",
  projectId: "Project ID",
  clientEmail: "Client email",
  privateKey: "Private key",
  publicKey: "Public key",
  accessToken: "Access token",
};

interface OrgForm {
  legalName: string;
  displayName: string;
  rfc: string;
  timezone: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  street: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  pais: string;
}

const EMPTY_ORG: OrgForm = {
  legalName: "",
  displayName: "",
  rfc: "",
  timezone: "America/Mexico_City",
  phone: "",
  email: "",
  website: "",
  logoUrl: "",
  primaryColor: "",
  secondaryColor: "",
  street: "",
  colonia: "",
  ciudad: "",
  estado: "",
  cp: "",
  pais: "Mexico",
};

function toOrgForm(org: OrganizationSettings): OrgForm {
  const fiscal = (org.fiscalAddress ?? {}) as Record<string, string>;
  return {
    legalName: org.legalName ?? "",
    displayName: org.displayName ?? "",
    rfc: org.rfc ?? "",
    timezone: org.timezone || "America/Mexico_City",
    phone: org.phone ?? "",
    email: org.email ?? "",
    website: org.website ?? "",
    logoUrl: org.logoUrl ?? "",
    primaryColor: org.primaryColor ?? "",
    secondaryColor: org.secondaryColor ?? "",
    street: fiscal.street ?? "",
    colonia: fiscal.colonia ?? "",
    ciudad: fiscal.ciudad ?? "",
    estado: fiscal.estado ?? "",
    cp: fiscal.cp ?? "",
    pais: fiscal.pais ?? "Mexico",
  };
}

function IntegrationCard({
  integration,
  onSaved,
}: {
  integration: IntegrationOption;
  onSaved: (message: string) => void;
}) {
  const [isEnabled, setIsEnabled] = useState(integration.isEnabled);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of Object.keys(integration.config)) {
      initial[field] = integration.secrets.includes(field) ? "" : integration.config[field] ?? "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: () =>
      api.put(`/admin/settings/integrations/${integration.provider}`, {
        isEnabled,
        config: values,
      }),
    onSuccess: () => {
      setError(null);
      onSaved(`${integration.label} guardado`);
      setValues((v) => {
        const next: Record<string, string> = { ...v };
        for (const secret of integration.secrets) next[secret] = "";
        return next;
      });
    },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const fieldKeys = useMemo(() => Object.keys(integration.config), [integration.config]);

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-medium text-ink-900">{integration.label}</h3>
          <p className="text-xs text-ink-500 mt-1">{integration.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`badge ${
              integration.configured
                ? "bg-success-100 text-success-700"
                : "bg-ink-100 text-ink-500"
            }`}
          >
            {integration.configured ? "Configurado" : "Sin configurar"}
          </span>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            Activa
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fieldKeys.map((field) => {
          const isSecret = integration.secrets.includes(field);
          return (
            <div key={field}>
              <label className="label text-xs">
                {FIELD_LABELS[field] ?? field}
                {isSecret && integration.configured ? " (guardado)" : ""}
              </label>
              <input
                className="input"
                type={isSecret ? "password" : "text"}
                autoComplete="new-password"
                value={values[field] ?? ""}
                placeholder={isSecret && integration.configured ? "********" : ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field]: e.target.value }))
                }
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          {isSecretPlaceholder(integration)
            ? "Deja los secretos vacios para conservar los valores actuales."
            : "Las credenciales se guardan cifradas."}
        </p>
        <button
          className="btn-primary"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
        >
          {saveMut.isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function isSecretPlaceholder(integration: IntegrationOption) {
  return integration.secrets.some((s) => integration.configured && integration.config[s] === "********");
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"clinic" | "integrations">("clinic");
  const [orgForm, setOrgForm] = useState<OrgForm>(EMPTY_ORG);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get("/admin/settings");
      return data as SettingsResponse;
    },
  });

  useEffect(() => {
    if (data?.organization) setOrgForm(toOrgForm(data.organization));
  }, [data?.organization]);

  const saveOrgMut = useMutation({
    mutationFn: () =>
      api.patch("/admin/settings", {
        legalName: orgForm.legalName.trim(),
        displayName: orgForm.displayName.trim(),
        rfc: orgForm.rfc.trim().toUpperCase(),
        timezone: orgForm.timezone,
        phone: orgForm.phone.trim(),
        email: orgForm.email.trim(),
        website: orgForm.website.trim(),
        logoUrl: orgForm.logoUrl.trim(),
        primaryColor: orgForm.primaryColor.trim(),
        secondaryColor: orgForm.secondaryColor.trim(),
        fiscalAddress: {
          street: orgForm.street.trim(),
          colonia: orgForm.colonia.trim(),
          ciudad: orgForm.ciudad.trim(),
          estado: orgForm.estado.trim(),
          cp: orgForm.cp.trim(),
          pais: orgForm.pais.trim(),
        },
      }),
    onSuccess: () => {
      setError(null);
      setNotice("Datos de la clinica guardados");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => {
      setNotice(null);
      setError(extractErrorMessage(e));
    },
  });

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!orgForm.legalName.trim() || !orgForm.rfc.trim()) {
      setError("Razon social y RFC son requeridos");
      return;
    }
    saveOrgMut.mutate();
  };

  const set = <K extends keyof OrgForm>(key: K, value: OrgForm[K]) =>
    setOrgForm((f) => ({ ...f, [key]: value }));

  if (isLoading) {
    return <div className="card text-ink-500">Cargando configuracion...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink-900">Configuracion</h2>
        <p className="text-sm text-ink-500 mt-1">
          Datos de la clinica, marca e integraciones de mensajeria y pagos.
        </p>
      </div>

      <div className="flex gap-2 border-b border-ink-100">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "clinic"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
          onClick={() => setTab("clinic")}
        >
          Clinica
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "integrations"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
          onClick={() => setTab("integrations")}
        >
          Integraciones
        </button>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}
      {notice && (
        <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
          <p className="text-sm text-success-700">{notice}</p>
        </div>
      )}

      {tab === "clinic" && (
        <form onSubmit={handleOrgSubmit} className="space-y-4">
          <div className="card space-y-4">
            <h3 className="font-medium text-ink-900">Datos generales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Razon social *</label>
                <input
                  className="input"
                  value={orgForm.legalName}
                  onChange={(e) => set("legalName", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label text-xs">RFC *</label>
                <input
                  className="input"
                  value={orgForm.rfc}
                  onChange={(e) => set("rfc", e.target.value.toUpperCase())}
                  maxLength={13}
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Nombre comercial</label>
                <input
                  className="input"
                  value={orgForm.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                  placeholder="Como aparece en el portal"
                />
              </div>
              <div>
                <label className="label text-xs">Zona horaria</label>
                <select
                  className="input"
                  value={orgForm.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Telefono</label>
                <input
                  className="input"
                  value={orgForm.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Email de contacto</label>
                <input
                  className="input"
                  type="email"
                  value={orgForm.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs">Sitio web</label>
                <input
                  className="input"
                  value={orgForm.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="font-medium text-ink-900">Marca</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label text-xs">URL del logo</label>
                <input
                  className="input"
                  value={orgForm.logoUrl}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://.../logo.png"
                />
                {orgForm.logoUrl && (
                  <img
                    src={orgForm.logoUrl}
                    alt="Logo"
                    className="mt-2 h-12 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div>
                <label className="label text-xs">Color primario</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 rounded border border-ink-200"
                    value={orgForm.primaryColor || "#0EA5A4"}
                    onChange={(e) => set("primaryColor", e.target.value)}
                  />
                  <input
                    className="input"
                    value={orgForm.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    placeholder="#0EA5A4"
                  />
                </div>
              </div>
              <div>
                <label className="label text-xs">Color secundario</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 rounded border border-ink-200"
                    value={orgForm.secondaryColor || "#0F172A"}
                    onChange={(e) => set("secondaryColor", e.target.value)}
                  />
                  <input
                    className="input"
                    value={orgForm.secondaryColor}
                    onChange={(e) => set("secondaryColor", e.target.value)}
                    placeholder="#0F172A"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="font-medium text-ink-900">Domicilio fiscal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label text-xs">Calle y numero</label>
                <input
                  className="input"
                  value={orgForm.street}
                  onChange={(e) => set("street", e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Colonia</label>
                <input
                  className="input"
                  value={orgForm.colonia}
                  onChange={(e) => set("colonia", e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Ciudad / Municipio</label>
                <input
                  className="input"
                  value={orgForm.ciudad}
                  onChange={(e) => set("ciudad", e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Estado</label>
                <input
                  className="input"
                  value={orgForm.estado}
                  onChange={(e) => set("estado", e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Codigo postal</label>
                <input
                  className="input"
                  value={orgForm.cp}
                  onChange={(e) => set("cp", e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Pais</label>
                <input
                  className="input"
                  value={orgForm.pais}
                  onChange={(e) => set("pais", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saveOrgMut.isPending}>
              {saveOrgMut.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          {(data?.integrations ?? []).map((integration) => (
            <IntegrationCard
              key={integration.provider}
              integration={integration}
              onSaved={(message) => {
                setNotice(message);
                setError(null);
                qc.invalidateQueries({ queryKey: ["settings"] });
              }}
            />
          ))}
          {!data?.integrations?.length && (
            <div className="card text-ink-500">Sin integraciones disponibles.</div>
          )}
        </div>
      )}
    </div>
  );
}
