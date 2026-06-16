import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { AppointmentModule } from "./appointment/appointment.module";
import { ClinicalRecordModule } from "./clinical-record/clinical-record.module";
import { PatientsModule } from "./patients/patients.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { PrescriptionsModule } from "./prescriptions/prescriptions.module";
import { ReportsModule } from "./reports/reports.module";
import { LabIntegrationModule } from "./lab-integration/lab-integration.module";
import { PaymentModule } from "./payment/payment.module";
import { PharmacyModule } from "./pharmacy/pharmacy.module";
import { MailModule } from "./mail/mail.module";
import { PdfModule } from "./pdf/pdf.module";
import { ReportScheduleModule } from "./report-schedule/report-schedule.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { CashRegisterModule } from "./cash-register/cash-register.module";
import { RolesModule } from "./roles/roles.module";
import { ServicesModule } from "./services/services.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { ObservabilityModule } from "./observability/observability.module";
import { MetricsInterceptor } from "./observability/metrics.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    ScheduleModule,
    AppointmentModule,
    ClinicalRecordModule,
    PatientsModule,
    DashboardModule,
    PrescriptionsModule,
    ReportsModule,
    LabIntegrationModule,
    PaymentModule,
    PharmacyModule,
    MailModule,
    PdfModule,
    ReportScheduleModule,
    NotificationsModule,
    WhatsappModule,
    CashRegisterModule,
    RolesModule,
    ServicesModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
