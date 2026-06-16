import { Injectable, Logger } from "@nestjs/common";
import { collectDefaultMetrics, Counter, Gauge, Histogram, register } from "prom-client";

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestsInFlight: Gauge<string>;
  public readonly dbQueryDuration: Histogram<string>;
  public readonly dbQueriesTotal: Counter<string>;
  public readonly activeUsers: Gauge<string>;
  public readonly appointmentsTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register, prefix: "medicontrol_" });

    this.httpRequestDuration = new Histogram({
      name: "medicontrol_http_request_duration_seconds",
      help: "Duracion de peticiones HTTP en segundos",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.httpRequestsTotal = new Counter({
      name: "medicontrol_http_requests_total",
      help: "Total de peticiones HTTP",
      labelNames: ["method", "route", "status"],
    });

    this.httpRequestsInFlight = new Gauge({
      name: "medicontrol_http_requests_in_flight",
      help: "Peticiones HTTP en curso",
    });

    this.dbQueryDuration = new Histogram({
      name: "medicontrol_db_query_duration_seconds",
      help: "Duracion de consultas a BD en segundos",
      labelNames: ["model", "action"],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.dbQueriesTotal = new Counter({
      name: "medicontrol_db_queries_total",
      help: "Total de consultas a BD",
      labelNames: ["model", "action"],
    });

    this.activeUsers = new Gauge({
      name: "medicontrol_active_users",
      help: "Usuarios activos (sesiones no expiradas)",
    });

    this.appointmentsTotal = new Counter({
      name: "medicontrol_appointments_total",
      help: "Total de citas creadas",
      labelNames: ["status"],
    });

    this.logger.log("Metricas Prometheus inicializadas");
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  recordHttpRequest(method: string, route: string, status: number, durationMs: number) {
    const labels = { method, route, status: String(status) };
    this.httpRequestDuration.observe(labels, durationMs / 1000);
    this.httpRequestsTotal.inc(labels);
  }

  recordDbQuery(model: string, action: string, durationMs: number) {
    const labels = { model, action };
    this.dbQueryDuration.observe(labels, durationMs / 1000);
    this.dbQueriesTotal.inc(labels);
  }

  incrementAppointments(status: string) {
    this.appointmentsTotal.inc({ status });
  }

  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  incrementInFlight() {
    this.httpRequestsInFlight.inc();
  }

  decrementInFlight() {
    this.httpRequestsInFlight.dec();
  }
}
