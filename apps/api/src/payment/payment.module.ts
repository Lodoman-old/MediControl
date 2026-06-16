import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { CashStrategy } from "./strategies/cash.strategy";
import { PosStrategy } from "./strategies/pos.strategy";
import { SpeiStrategy } from "./strategies/spei.strategy";
import { MercadoPagoStrategy } from "./strategies/mercadopago.strategy";

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, CashStrategy, PosStrategy, SpeiStrategy, MercadoPagoStrategy],
  exports: [PaymentService],
})
export class PaymentModule {}
