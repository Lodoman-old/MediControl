import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  info() {
    return {
      name: "MediControl API",
      version: "0.1.0",
      docs: "/api/docs",
    };
  }

  health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
