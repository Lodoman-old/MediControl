import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ReportScheduleController } from "./report-schedule.controller";
import { ReportScheduleService } from "./report-schedule.service";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [ScheduleModule.forRoot(), ReportsModule],
  controllers: [ReportScheduleController],
  providers: [ReportScheduleService],
})
export class ReportScheduleModule {}
