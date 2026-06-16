import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method ?? "UNKNOWN";
    const route = req.route?.path ?? req.url ?? "unknown";

    this.metrics.incrementInFlight();
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = performance.now() - start;
          this.metrics.recordHttpRequest(method, route, res.statusCode ?? 200, duration);
          this.metrics.decrementInFlight();
        },
        error: () => {
          const duration = performance.now() - start;
          this.metrics.recordHttpRequest(method, route, 500, duration);
          this.metrics.decrementInFlight();
        },
      }),
    );
  }
}
