import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_API_BASE_URL =
  "https://medicontrol-api-h9x3.onrender.com/api/v1";
export const DEFAULT_WEB_BASE_URL = "https://medicontrol-web.onrender.com";

const STORAGE_KEY = "medicontrol.apiBaseUrl";
const WEB_STORAGE_KEY = "medicontrol.webBaseUrl";

export function normalizeApiBaseUrl(raw: string): string {
  let value = raw.trim();
  if (!value) return DEFAULT_API_BASE_URL;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  value = value.replace(/\/+$/, "");
  if (!/\/api\/v1$/i.test(value)) value = `${value}/api/v1`;
  return value;
}

export async function loadApiBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? normalizeApiBaseUrl(stored) : DEFAULT_API_BASE_URL;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

export async function saveApiBaseUrl(raw: string): Promise<string> {
  const value = normalizeApiBaseUrl(raw);
  await AsyncStorage.setItem(STORAGE_KEY, value);
  return value;
}

export function normalizeWebBaseUrl(raw: string): string {
  let value = raw.trim();
  if (!value) return DEFAULT_WEB_BASE_URL;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return value.replace(/\/+$/, "");
}

export async function loadWebBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(WEB_STORAGE_KEY);
    return stored ? normalizeWebBaseUrl(stored) : DEFAULT_WEB_BASE_URL;
  } catch {
    return DEFAULT_WEB_BASE_URL;
  }
}

export async function saveWebBaseUrl(raw: string): Promise<string> {
  const value = normalizeWebBaseUrl(raw);
  await AsyncStorage.setItem(WEB_STORAGE_KEY, value);
  return value;
}
