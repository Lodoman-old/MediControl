import { Module } from "@nestjs/common";
import { ClinicalRecordController } from "./clinical-record.controller";
import { ClinicalRecordService } from "./clinical-record.service";

@Module({
  controllers: [ClinicalRecordController],
  providers: [ClinicalRecordService],
  exports: [ClinicalRecordService],
})
export class ClinicalRecordModule {}
