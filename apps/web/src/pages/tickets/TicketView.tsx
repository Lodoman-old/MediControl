import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

type TicketKind = "pago" | "venta";

export default function TicketViewPage() {
  const { kind, id } = useParams<{ kind: TicketKind; id: string }>();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const path =
    kind === "venta" ? `/pharmacy/sales/${id}/ticket` : `/payments/${id}/ticket`;

  const { data: html, isLoading, error } = useQuery({
    queryKey: ["ticket", kind, id],
    queryFn: async () => {
      const { data } = await api.get<string>(path, { responseType: "text" });
      return data;
    },
    enabled: Boolean(id) && (kind === "pago" || kind === "venta"),
  });

  const goBack = () =>
    navigate(kind === "venta" ? "/farmacia/ventas" : `/pagos/${id}`);

  const print = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <button onClick={goBack} className="text-sm text-primary-600 hover:text-primary-800">
            &larr; Volver
          </button>
          <h2 className="text-2xl font-semibold text-ink-900 mt-1">
            {kind === "venta" ? "Ticket de venta" : "Ticket de consulta"}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={print} disabled={!html} className="btn-primary text-sm">
            Imprimir
          </button>
          <button onClick={goBack} className="btn-secondary text-sm">
            Cerrar
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-ink-500">Generando ticket...</p>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-danger-700">{extractErrorMessage(error)}</p>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Ticket"
            srcDoc={html}
            className="w-full h-[75vh] min-h-[560px] bg-white"
          />
        )}
      </div>
    </div>
  );
}
