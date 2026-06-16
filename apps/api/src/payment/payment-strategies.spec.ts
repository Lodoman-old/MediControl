import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CashStrategy } from "./strategies/cash.strategy";
import { PosStrategy } from "./strategies/pos.strategy";
import { SpeiStrategy } from "./strategies/spei.strategy";
import type { ProcessPaymentResult } from "./strategies/payment-strategy.interface";

async function makeStrategy(Cls: any) {
  const mod = await Test.createTestingModule({
    providers: [Cls, { provide: ConfigService, useValue: { get: () => "false" } }],
  }).compile();
  return mod.get(Cls) as { process(p: any): Promise<ProcessPaymentResult>; readonly method: string };
}

describe("CashStrategy", () => {
  it("processes cash payment", async () => {
    const s = await makeStrategy(CashStrategy);
    const result = await s.process({ amount: 100, currency: "MXN" } as any);
    expect(result.success).toBe(true);
    expect(result.reference).toBeDefined();
    expect(result.reference).toMatch(/^CASH-/);
  });

  it("returns success for zero amount", async () => {
    const s = await makeStrategy(CashStrategy);
    const result = await s.process({ amount: 0, currency: "MXN" } as any);
    expect(result.success).toBe(true);
  });

  it("handles missing currency default", async () => {
    const s = await makeStrategy(CashStrategy);
    const result = await s.process({ amount: 50 } as any);
    expect(result.success).toBe(true);
  });

  it("assigns unique reference each call", async () => {
    const s = await makeStrategy(CashStrategy);
    const r1 = await s.process({ amount: 10 } as any);
    await new Promise(r => setTimeout(r, 2));
    const r2 = await s.process({ amount: 10 } as any);
    expect(r1.reference).not.toBe(r2.reference);
  });
});

describe("PosStrategy", () => {
  it("processes POS payment", async () => {
    const s = await makeStrategy(PosStrategy);
    const result = await s.process({ amount: 200, currency: "MXN" } as any);
    expect(result.success).toBe(true);
    expect(result.reference).toMatch(/^POS-/);
  });

  it("returns success for large amounts", async () => {
    const s = await makeStrategy(PosStrategy);
    const result = await s.process({ amount: 99999, currency: "MXN" } as any);
    expect(result.success).toBe(true);
    expect(result.reference).toBeDefined();
  });
});

describe("SpeiStrategy", () => {
  it("processes SPEI transfer", async () => {
    const s = await makeStrategy(SpeiStrategy);
    const result = await s.process({ amount: 300, currency: "MXN" } as any);
    expect(result.success).toBe(true);
    expect(result.reference).toMatch(/^SPEI-/);
  });

  it("generates unique CLABE reference", async () => {
    const s = await makeStrategy(SpeiStrategy);
    const r1 = await s.process({ amount: 100 } as any);
    await new Promise(r => setTimeout(r, 2));
    const r2 = await s.process({ amount: 100 } as any);
    expect(r1.reference).not.toBe(r2.reference);
  });

  it("handles different currencies", async () => {
    const s = await makeStrategy(SpeiStrategy);
    const result = await s.process({ amount: 500, currency: "USD" } as any);
    expect(result.success).toBe(true);
  });

  it("returns gateway response with reference", async () => {
    const s = await makeStrategy(SpeiStrategy);
    const result = await s.process({ amount: 150 } as any);
    expect(result.gatewayResponse).toBeDefined();
    expect(result.reference).toBeDefined();
  });
});
