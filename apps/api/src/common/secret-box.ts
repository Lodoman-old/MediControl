import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Cifra/descifra JSON con AES-256-GCM. El resultado se guarda como base64 de
 * iv (16) + tag (16) + ciphertext.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = scryptSync(secret, "medicontrol-integrations-salt", 32);
  }

  encrypt(value: unknown): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const data = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, data]).toString("base64");
  }

  decrypt<T>(payload: string): T {
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, 16);
    const tag = raw.subarray(16, 32);
    const data = raw.subarray(32);
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    const json = decipher.update(data, undefined, "utf8") + decipher.final("utf8");
    return JSON.parse(json) as T;
  }
}
