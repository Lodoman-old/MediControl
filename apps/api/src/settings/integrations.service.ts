import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SecretBox } from "../common/secret-box";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "./integration-providers";

export interface IntegrationConfigValue {
  isEnabled: boolean;
  config: Record<string, string>;
  updatedAt: Date;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly box: SecretBox;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const secret =
      config.get<string>("INTEGRATIONS_ENCRYPTION_KEY") ??
      config.get<string>("MFA_ENCRYPTION_KEY");

    if (!secret || secret.length < 16) {
      this.logger.warn(
        "INTEGRATIONS_ENCRYPTION_KEY/MFA_ENCRYPTION_KEY ausente o corta: usando llave de desarrollo",
      );
    }

    this.box = new SecretBox(secret && secret.length >= 16 ? secret : "medicontrol-dev-integrations-key");
  }

  async getConfig(
    organizationId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationConfigValue | null> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    if (!row) return null;
    return this.decodeRow(row);
  }

  async listConfigs(organizationId: string): Promise<
    Array<{
      provider: IntegrationProvider;
      label: string;
      description: string;
      isEnabled: boolean;
      configured: boolean;
      config: Record<string, string>;
      secrets: readonly string[];
      updatedAt: Date | null;
    }>
  > {
    const rows = await this.prisma.integrationConfig.findMany({
      where: { organizationId },
    });
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    return Object.entries(INTEGRATION_PROVIDERS).map(([key, meta]) => {
      const provider = key as IntegrationProvider;
      const row = byProvider.get(provider);
      const decoded = row ? this.decodeRow(row) : null;
      const raw = decoded?.config ?? {};
      const masked: Record<string, string> = {};

      for (const field of meta.fields) {
        const value = raw[field] ?? "";
        masked[field] =
          (meta.secrets as readonly string[]).includes(field) && value
            ? "********"
            : value;
      }

      return {
        provider,
        label: meta.label,
        description: meta.description,
        isEnabled: decoded?.isEnabled ?? false,
        configured: Boolean(row?.configEnc),
        config: masked,
        secrets: meta.secrets,
        updatedAt: decoded?.updatedAt ?? null,
      };
    });
  }

  async saveConfig(
    organizationId: string,
    provider: IntegrationProvider,
    isEnabled: boolean,
    patch: Record<string, unknown>,
    updatedBy?: string,
  ): Promise<void> {
    const meta = INTEGRATION_PROVIDERS[provider];
    const existing = await this.prisma.integrationConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    const current = existing ? this.decodeRow(existing).config : {};
    const merged: Record<string, string> = { ...current };

    for (const field of meta.fields) {
      if (!(field in patch)) continue;
      const value = patch[field];
      const isSecret = (meta.secrets as readonly string[]).includes(field);

      if (value === undefined || value === null) continue;
      if (isSecret && (value === "" || value === "********")) continue;

      if (typeof value === "string") merged[field] = value;
      else if (typeof value === "number" || typeof value === "boolean") {
        merged[field] = String(value);
      }
    }

    const data = {
      isEnabled,
      configEnc: this.box.encrypt(merged),
      updatedBy: updatedBy ?? null,
    };

    await this.prisma.integrationConfig.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: { organizationId, provider, ...data },
      update: data,
    });
  }

  private decodeRow(row: {
    isEnabled: boolean;
    configEnc: string | null;
    updatedAt: Date;
  }): IntegrationConfigValue {
    let config: Record<string, string> = {};
    if (row.configEnc) {
      try {
        config = this.box.decrypt<Record<string, string>>(row.configEnc);
      } catch (err) {
        this.logger.error("No se pudo descifrar la configuracion de integracion", err as Error);
      }
    }
    return { isEnabled: row.isEnabled, config, updatedAt: row.updatedAt };
  }
}
