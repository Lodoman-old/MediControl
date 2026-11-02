import { Linking } from "react-native";

/** Normaliza telefonos mexicanos para enlaces wa.me (sin +, sin espacios). */
export function normalizeWhatsappNumber(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 10) return null;
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `52${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  if (digits.length === 13 && digits.startsWith("521")) return `52${digits.slice(3)}`;
  return digits;
}

export function buildWhatsappUrl(
  rawPhone: string | null | undefined,
  message: string,
): string | null {
  const phone = normalizeWhatsappNumber(rawPhone);
  if (!phone) return null;
  const text = message.trim();
  return text
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${phone}`;
}

/** Abre WhatsApp con el mensaje precargado. Devuelve false si no hay telefono valido. */
export async function openWhatsapp(
  rawPhone: string | null | undefined,
  message = "",
): Promise<boolean> {
  const url = buildWhatsappUrl(rawPhone, message);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}

export function buildPatientGreeting(patientName?: string | null): string {
  const name = (patientName ?? "").trim().split(/\s+/)[0] ?? "";
  return `Hola${name ? ` ${name}` : ""}, le saludamos de su clinica. En que podemos ayudarle?`;
}
