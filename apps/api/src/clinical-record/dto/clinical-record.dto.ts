import { IsString, IsOptional, IsUUID, IsInt, IsEnum, Min, Max, IsDateString, IsArray, ValidateNested, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

// --- VITAL SIGNS ---

export class VitalSignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  heartRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  respiratoryRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  glucose?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// --- CLINICAL NOTES ---

export class CreateClinicalNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ example: "2026-06-09T10:00:00.000Z" })
  @IsDateString()
  noteDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ type: VitalSignDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalSignDto)
  vitalSigns?: VitalSignDto;
}

export class UpdateClinicalNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;
}

// --- DIAGNOSES ---

export class CreateDiagnosisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ example: "J45.0" })
  @IsString()
  icd10Code!: string;

  @ApiProperty({ example: "Asma alérgico no complicado" })
  @IsString()
  description!: string;

  @ApiProperty({ enum: ["PRINCIPAL", "SECONDARY", "DIFFERENTIAL"], default: "PRINCIPAL" })
  @IsOptional()
  @IsEnum(["PRINCIPAL", "SECONDARY", "DIFFERENTIAL"] as const)
  type?: "PRINCIPAL" | "SECONDARY" | "DIFFERENTIAL";

  @ApiProperty({ enum: ["ACTIVE", "RESOLVED", "SUSPECTED"], default: "ACTIVE" })
  @IsOptional()
  @IsEnum(["ACTIVE", "RESOLVED", "SUSPECTED"] as const)
  status?: "ACTIVE" | "RESOLVED" | "SUSPECTED";
}

export class UpdateDiagnosisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icd10Code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ["PRINCIPAL", "SECONDARY", "DIFFERENTIAL"] })
  @IsOptional()
  @IsEnum(["PRINCIPAL", "SECONDARY", "DIFFERENTIAL"] as const)
  type?: "PRINCIPAL" | "SECONDARY" | "DIFFERENTIAL";

  @ApiPropertyOptional({ enum: ["ACTIVE", "RESOLVED", "SUSPECTED"] })
  @IsOptional()
  @IsEnum(["ACTIVE", "RESOLVED", "SUSPECTED"] as const)
  status?: "ACTIVE" | "RESOLVED" | "SUSPECTED";
}

// --- TREATMENTS ---

export class CreateTreatmentDto {
  @ApiProperty({ example: "Ibuprofeno 400mg cada 8 horas" })
  @IsString()
  description!: string;

  @ApiProperty({ enum: ["PHARMACOLOGICAL", "NON_PHARMACOLOGICAL", "SURGICAL"] })
  @IsEnum(["PHARMACOLOGICAL", "NON_PHARMACOLOGICAL", "SURGICAL"] as const)
  type!: "PHARMACOLOGICAL" | "NON_PHARMACOLOGICAL" | "SURGICAL";

  @ApiProperty({ example: "2026-06-09" })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indications?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "COMPLETED", "CANCELLED", "ON_HOLD"] })
  @IsOptional()
  @IsEnum(["ACTIVE", "COMPLETED", "CANCELLED", "ON_HOLD"] as const)
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED" | "ON_HOLD";
}

export class UpdateTreatmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ["PHARMACOLOGICAL", "NON_PHARMACOLOGICAL", "SURGICAL"] })
  @IsOptional()
  @IsEnum(["PHARMACOLOGICAL", "NON_PHARMACOLOGICAL", "SURGICAL"] as const)
  type?: "PHARMACOLOGICAL" | "NON_PHARMACOLOGICAL" | "SURGICAL";

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indications?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "COMPLETED", "CANCELLED", "ON_HOLD"] })
  @IsOptional()
  @IsEnum(["ACTIVE", "COMPLETED", "CANCELLED", "ON_HOLD"] as const)
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED" | "ON_HOLD";
}

// --- INFORMED CONSENTS ---

export class CreateConsentDto {
  @ApiProperty({ enum: ["GENERAL", "SURGERY", "ANESTHESIA", "BLOOD_TRANSFUSION", "RESEARCH", "OTHERS"] })
  @IsEnum(["GENERAL", "SURGERY", "ANESTHESIA", "BLOOD_TRANSFUSION", "RESEARCH", "OTHERS"] as const)
  consentType!: "GENERAL" | "SURGERY" | "ANESTHESIA" | "BLOOD_TRANSFUSION" | "RESEARCH" | "OTHERS";

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  signedByPatientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  witnessedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}

// --- LAB ORDERS ---

export class CreateLabOrderDto {
  @ApiProperty({ enum: ["LABORATORY", "IMAGING", "PATHOLOGY", "OTHER"] })
  @IsEnum(["LABORATORY", "IMAGING", "PATHOLOGY", "OTHER"] as const)
  studyType!: "LABORATORY" | "IMAGING" | "PATHOLOGY" | "OTHER";

  @ApiProperty({ example: "Biometría hemática" })
  @IsString()
  studyName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indication?: string;
}

export class UpdateLabOrderDto {
  @ApiPropertyOptional({ enum: ["PENDING", "COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] })
  @IsOptional()
  @IsEnum(["PENDING", "COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const)
  status?: "PENDING" | "COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export class CreateLabResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resultDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultFileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// --- MEDICAL RECORD HISTORY ---

export class UpdateMedicalHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nonPathologicalHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pathologicalHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentIllness?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemsReview?: string;
}
