import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

let app: INestApplication | null = null;
let prisma: PrismaService | null = null;

export async function getApp(): Promise<INestApplication> {
  if (app) return app;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();

  // Reset MFA and mustChangePassword for test users
  prisma = app.get(PrismaService);
  await prisma!.user.updateMany({
    where: { email: { in: ["admin@medicontrol.mx", "doctor@medicontrol.mx", "paciente@medicontrol.mx"] } },
    data: { mfaEnabled: false, mfaSecretEnc: null, mustChangePassword: false },
  });

  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
    prisma = null;
  }
}

export async function resolveDoctorId(userId: string): Promise<string | null> {
  if (!prisma) return null;
  const doctor = await prisma.doctor.findFirst({
    where: { userId },
    select: { id: true },
  });
  return doctor?.id ?? null;
}

export async function resolvePatientId(userId: string): Promise<string | null> {
  if (!prisma) return null;
  const patient = await prisma.patient.findFirst({
    where: { userId },
    select: { id: true },
  });
  return patient?.id ?? null;
}
