import { Module } from "@nestjs/common";
import { ReportScheduleController } from "./report-schedule.controller";
import { ReportScheduleService } from "./report-schedule.service";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [ReportsModule],
  controllers: [ReportScheduleController],
  providers: [ReportScheduleService],
})
export class ReportScheduleModule {}
