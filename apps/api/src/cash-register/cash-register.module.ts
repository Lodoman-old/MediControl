import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CashRegisterController } from "./cash-register.controller";

@Module({
  imports: [PrismaModule],
  controllers: [CashRegisterController],
})
export class CashRegisterModule {}
