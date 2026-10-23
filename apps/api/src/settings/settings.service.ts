import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IntegrationsService } from "./integrations.service";
import { isIntegrationProvider } from "./integration-providers";
import type { UpdateOrganizationSettingsDto } from "./dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  async getSettings(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        legalName: true,
        displayName: true,
        rfc: true,
        orgType: true,
        slug: true,
        timezone: true,
        fiscalAddress: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        phone: true,
        email: true,
        website: true,
        updatedAt: true,
      },
    });
    if (!organization) throw new NotFoundException("Organizacion no encontrada");

    const integrations = await this.integrations.listConfigs(organizationId);
    return { organization, integrations };
  }

  async updateSettings(organizationId: string, dto: UpdateOrganizationSettingsDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, fiscalAddress: true },
    });
    if (!existing) throw new NotFoundException("Organizacion no encontrada");

    if (dto.timezone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: dto.timezone });
      } catch {
        throw new BadRequestException("Zona horaria invalida");
      }
    }

    const data: Record<string, unknown> = {};
    const simpleFields = [
      "legalName",
      "rfc",
      "displayName",
      "logoUrl",
      "primaryColor",
      "secondaryColor",
      "phone",
      "email",
      "website",
      "timezone",
    ] as const;

    for (const field of simpleFields) {
      if (dto[field] !== undefined) data[field] = dto[field];
    }

    if (dto.fiscalAddress) {
      const current = (existing.fiscalAddress ?? {}) as Record<string, unknown>;
      data.fiscalAddress = { ...current, ...dto.fiscalAddress };
    }

    await this.prisma.organization.update({ where: { id: organizationId }, data });
    return this.getSettings(organizationId);
  }

  async updateIntegration(
    organizationId: string,
    provider: string,
    isEnabled: boolean,
    config: Record<string, unknown>,
    updatedBy?: string,
  ) {
    if (!isIntegrationProvider(provider)) {
      throw new BadRequestException("Proveedor de integracion invalido");
    }
    await this.integrations.saveConfig(organizationId, provider, isEnabled, config, updatedBy);
    return this.getSettings(organizationId);
  }
}
