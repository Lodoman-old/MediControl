import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateLabProviderDto, UpdateLabProviderDto } from "./dto/lab-provider.dto";

@Injectable()
export class LabIntegrationService {
  private readonly logger = new Logger(LabIntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProvider(organizationId: string, dto: CreateLabProviderDto) {
    return this.prisma.labProvider.create({
      data: {
        organizationId,
        providerCode: dto.providerCode,
        providerName: dto.providerName,
        apiEndpoint: dto.apiEndpoint,
        apiKeyEnc: dto.apiKeyEnc ?? null,
        config: (dto.config ?? {}) as any,
        isActive: dto.isActive ?? false,
      },
    });
  }

  async listProviders(organizationId: string) {
    return this.prisma.labProvider.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateProvider(organizationId: string, id: string, dto: UpdateLabProviderDto) {
    const existing = await this.prisma.labProvider.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Proveedor de laboratorio no encontrado");

    return this.prisma.labProvider.update({
      where: { id },
      data: {
        ...(dto.providerName !== undefined && { providerName: dto.providerName }),
        ...(dto.apiEndpoint !== undefined && { apiEndpoint: dto.apiEndpoint }),
        ...(dto.apiKeyEnc !== undefined && { apiKeyEnc: dto.apiKeyEnc }),
        ...(dto.config !== undefined && { config: dto.config as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeProvider(organizationId: string, id: string) {
    const existing = await this.prisma.labProvider.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Proveedor de laboratorio no encontrado");
    await this.prisma.labProvider.delete({ where: { id } });
    return { deleted: true };
  }

  async syncLabOrders(organizationId: string, providerId?: string) {
    const where: any = { organizationId };
    if (providerId) where.id = providerId;
    if (!providerId) where.isActive = true;

    const providers = await this.prisma.labProvider.findMany({ where });
    if (providers.length === 0) throw new NotFoundException("No hay proveedores activos");

    for (const provider of providers) {
      this.logger.log(`Sincronizando con ${provider.providerName}...`);
      // External API call would go here
      await this.prisma.labProvider.update({
        where: { id: provider.id },
        data: { lastSyncAt: new Date() },
      });
    }

    return { synced: providers.length, providers: providers.map((p) => p.providerName) };
  }

  async receiveResults(
    organizationId: string,
    providerCode: string,
    results: Array<{ orderRef: string; resultText: string; resultDate?: string }>,
  ) {
    const provider = await this.prisma.labProvider.findUnique({
      where: { organizationId_providerCode: { organizationId, providerCode } },
    });
    if (!provider) throw new NotFoundException("Proveedor no encontrado");

    const created: string[] = [];
    for (const r of results) {
      const labOrder = await this.prisma.labOrder.findFirst({
        where: { organizationId, id: r.orderRef },
      });
      if (!labOrder) {
        this.logger.warn(`Orden ${r.orderRef} no encontrada, ignorando resultado`);
        continue;
      }
      await this.prisma.labResult.create({
        data: {
          labOrderId: labOrder.id,
          resultText: r.resultText,
          resultDate: r.resultDate ? new Date(r.resultDate) : new Date(),
        },
      });
      await this.prisma.labOrder.update({
        where: { id: labOrder.id },
        data: { status: "COMPLETED" },
      });
      created.push(labOrder.id);
      this.logger.log(`Resultado registrado para orden ${labOrder.id}`);
    }

    return { received: created.length, orderIds: created };
  }
}
