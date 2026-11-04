import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdatePatientProfileDto } from "../auth/dto/register.dto";
import { hash as argonHash } from "@node-rs/argon2";
import type { CreatePatientByStaffDto } from "./dto/create-patient-staff.dto";
import type { QuickCreatePatientDto } from "./dto/quick-create-patient.dto";
import type { PortalInvitationDto } from "./dto/portal-invitation.dto";
import { AuthService } from "../auth/auth.service";
import { randomBytes } from "crypto";

function isTemporaryEmail(email: string | null | undefined): boolean {
  return !email || email.toLowerCase().endsWith("@medicontrol.local");
}

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async createPatientByStaff(organizationId: string, dto: CreatePatientByStaffDto) {
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Ya existe un usuario con ese email en esta organizacion");
    }

    const passwordHash = await argonHash(dto.password);
    const mrn = await this.generateMrn(organizationId);

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          organizationId,
          firstName: dto.firstName,
          lastNameP: dto.lastNameP,
          lastNameM: dto.lastNameM ?? null,
          birthDate: new Date(dto.birthDate),
          gender: dto.gender as any,
          curp: dto.curp ?? null,
          nationality: dto.nationality ?? null,
          occupation: dto.occupation ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId,
          personId: person.id,
          email: dto.email,
          phoneE164: dto.phone,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: true,
        },
      });

      const patient = await tx.patient.create({
        data: {
          organizationId,
          userId: user.id,
          personId: person.id,
          mrn,
          preferredLanguage: "es-MX",
          consentPrivacyAt: new Date(),
        },
      });

      const patientRole = await tx.role.findFirst({
        where: { organizationId, code: "PATIENT" },
      });
      if (patientRole) {
        await tx.userRole.create({
          data: {
            organizationId,
            userId: user.id,
            roleId: patientRole.id,
          },
        });
      }

      return { person, user, patient };
    });

    this.logger.log(`Paciente creado por staff: ${dto.email} (${result.patient.id})`);

    return {
      id: result.patient.id,
      mrn: result.patient.mrn,
      fullName: `${result.person.firstName} ${result.person.lastNameP}${result.person.lastNameM ? " " + result.person.lastNameM : ""}`,
      email: result.user.email,
      phone: result.user.phoneE164,
    };
  }

  async quickCreatePatient(organizationId: string, dto: QuickCreatePatientDto) {
    const tempEmail = `temp+${randomBytes(8).toString("hex")}@medicontrol.local`;
    const tempPassword = randomBytes(12).toString("base64url");
    const passwordHash = await argonHash(tempPassword);
    const mrn = await this.generateMrn(organizationId);

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          organizationId,
          firstName: dto.firstName,
          lastNameP: dto.lastNameP,
          lastNameM: dto.lastNameM ?? null,
          birthDate: new Date(dto.birthDate),
          gender: dto.gender as any,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId,
          personId: person.id,
          email: tempEmail,
          phoneE164: dto.phone,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: true,
        },
      });

      const patient = await tx.patient.create({
        data: {
          organizationId,
          userId: user.id,
          personId: person.id,
          mrn,
          preferredLanguage: "es-MX",
          consentPrivacyAt: new Date(),
        },
      });

      const patientRole = await tx.role.findFirst({
        where: { organizationId, code: "PATIENT" },
      });
      if (patientRole) {
        await tx.userRole.create({
          data: {
            organizationId,
            userId: user.id,
            roleId: patientRole.id,
          },
        });
      }

      return { person, user, patient };
    });

    this.logger.log(`Paciente rapido creado: ${result.patient.id} (${dto.firstName} ${dto.lastNameP})`);

    return {
      id: result.patient.id,
      mrn: result.patient.mrn,
      fullName: `${result.person.firstName} ${result.person.lastNameP}${result.person.lastNameM ? " " + result.person.lastNameM : ""}`,
      phone: result.user.phoneE164,
    };
  }

  async inviteToPortal(
    organizationId: string,
    patientId: string,
    dto: PortalInvitationDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      include: { person: true, user: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const requestedEmail = dto.email?.trim().toLowerCase() || null;
    const currentEmail = patient.user?.email?.toLowerCase() ?? null;
    const targetEmail = requestedEmail ?? (isTemporaryEmail(currentEmail) ? null : currentEmail);
    if (!targetEmail) {
      throw new BadRequestException(
        "El paciente aun no tiene correo registrado. Proporciona un correo para enviar la invitacion.",
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        organizationId,
        email: targetEmail,
        ...(patient.userId ? { NOT: { id: patient.userId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException("Ya existe un usuario con ese correo en esta organizacion");
    }

    let userId = patient.userId;
    if (!userId) {
      const temporaryPassword = randomBytes(12).toString("base64url");
      const user = await this.prisma.user.create({
        data: {
          organizationId,
          personId: patient.personId,
          email: targetEmail,
          passwordHash: await argonHash(temporaryPassword),
          status: "ACTIVE",
          mustChangePassword: true,
        },
      });
      userId = user.id;
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: { userId: user.id },
      });
    } else if (requestedEmail && requestedEmail !== currentEmail) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: targetEmail },
      });
    }

    const patientRole = await this.prisma.role.findFirst({
      where: { organizationId, code: "PATIENT" },
    });
    if (patientRole) {
      const hasRole = await this.prisma.userRole.findFirst({
        where: { userId, roleId: patientRole.id },
      });
      if (!hasRole) {
        await this.prisma.userRole.create({
          data: { organizationId, userId, roleId: patientRole.id },
        });
      }
    }

    const invitation = await this.auth.sendPortalInvitation(userId);
    this.logger.log(`Invitacion al portal para paciente ${patient.id} / ${targetEmail}`);

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      email: targetEmail,
      invitationUrl: invitation.invitationUrl,
      emailSent: invitation.emailSent,
    };
  }

  async listPatients(organizationId: string, query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (query.search) {
      where.OR = [
        { person: { firstName: { contains: query.search, mode: "insensitive" } } },
        { person: { lastNameP: { contains: query.search, mode: "insensitive" } } },
        { person: { lastNameM: { contains: query.search, mode: "insensitive" } } },
        { mrn: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, patients] = await Promise.all([
      this.prisma.patient.count({ where: where as any }),
      this.prisma.patient.findMany({
        where: where as any,
        include: { person: true, user: { select: { email: true, phoneE164: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      data: patients.map((p) => ({
        id: p.id,
        mrn: p.mrn,
        fullName: `${p.person.firstName} ${p.person.lastNameP}${p.person.lastNameM ? " " + p.person.lastNameM : ""}`,
        email: isTemporaryEmail(p.user?.email) ? null : (p.user?.email ?? null),
        phone: p.user?.phoneE164 ?? null,
        bloodType: p.bloodType,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPatient(organizationId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, organizationId },
      include: { person: true, user: true },
    });
    if (!patient) return null;
    return this.formatPatient(patient);
  }

  async getMyPatient(organizationId: string, userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId, userId },
      include: { person: true, user: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado para este usuario");
    return this.formatPatient(patient);
  }

  async updateProfile(organizationId: string, userId: string, dto: UpdatePatientProfileDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId, userId },
      include: { person: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const personData: Record<string, unknown> = {};
    if (dto.firstName !== undefined) personData.firstName = dto.firstName;
    if (dto.lastNameP !== undefined) personData.lastNameP = dto.lastNameP;
    if (dto.lastNameM !== undefined) personData.lastNameM = dto.lastNameM;
    if (dto.nationality !== undefined) personData.nationality = dto.nationality;
    if (dto.occupation !== undefined) personData.occupation = dto.occupation;

    if (Object.keys(personData).length > 0) {
      await this.prisma.person.update({
        where: { id: patient.personId },
        data: personData as any,
      });
    }

    if (dto.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phoneE164: dto.phone },
      });
    }

    const patientData: Record<string, unknown> = {};
    if (dto.bloodType !== undefined) patientData.bloodType = dto.bloodType;
    if (dto.preferredLanguage !== undefined) patientData.preferredLanguage = dto.preferredLanguage;

    if (Object.keys(patientData).length > 0) {
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: patientData as any,
      });
    }

    return this.getMyPatient(organizationId, userId);
  }

  async getMedicalHistory(organizationId: string, userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const [appointments, medicalRecord, prescriptions] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId: patient.id, organizationId },
        include: {
          doctor: { include: { person: { select: { firstName: true, lastNameP: true } } } },
          service: { select: { name: true } },
          clinicalNotes: true,
        },
        orderBy: { startsAt: "desc" },
        take: 50,
      }),
      this.prisma.medicalRecord.findFirst({
        where: { patientId: patient.id, organizationId },
        include: {
          diagnoses: true,
          treatments: true,
          labOrders: { include: { results: true } },
        },
      }),
      this.prisma.prescription.findMany({
        where: { patientId: patient.id, organizationId },
        orderBy: { prescribedAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      appointments: appointments.map((a) => ({
        id: a.id,
        date: a.startsAt,
        status: a.status,
        doctorName: a.doctor?.person
          ? `${a.doctor.person.firstName} ${a.doctor.person.lastNameP}`
          : null,
        service: a.service?.name ?? null,
        reason: a.reason,
      })),
      medicalRecord: medicalRecord
        ? {
            diagnoses: medicalRecord.diagnoses,
            treatments: medicalRecord.treatments,
            labOrders: medicalRecord.labOrders.map((o) => ({
              id: o.id,
              studyName: o.studyName,
              status: o.status,
              results: o.results,
            })),
          }
        : null,
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        medication: p.medication,
        dosage: p.dosage,
        status: p.status,
        prescribedAt: p.prescribedAt,
      })),
    };
  }

  private async generateMrn(organizationId: string): Promise<string> {
    const lastPatient = await this.prisma.patient.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { mrn: true },
    });
    let nextNum = 1;
    if (lastPatient?.mrn) {
      const match = lastPatient.mrn.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `MCN-${String(nextNum).padStart(6, "0")}`;
  }

  private formatPatient(patient: any) {
    return {
      id: patient.id,
      mrn: patient.mrn,
      fullName: `${patient.person.firstName} ${patient.person.lastNameP}${patient.person.lastNameM ? " " + patient.person.lastNameM : ""}`,
      email: isTemporaryEmail(patient.user?.email) ? null : (patient.user?.email ?? null),
      phone: patient.user?.phoneE164 ?? null,
      bloodType: patient.bloodType,
      emergencyContact: patient.emergencyContact,
      insurance: patient.insurance,
      preferredLanguage: patient.preferredLanguage,
      consentPrivacyAt: patient.consentPrivacyAt,
      person: patient.person,
    };
  }
}
