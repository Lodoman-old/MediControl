import Constants from "expo-constants";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/authStore";

function resolveApiUrl(): string {
  const fromExtra =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromExtra && !fromExtra.includes("localhost")) return fromExtra;

  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  return "http://localhost:3000";
}

const RAW_API_URL = resolveApiUrl();
const API_BASE_URL = `${RAW_API_URL}/api/v1`;

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const processQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            original.headers.set("Authorization", `Bearer ${token}`);
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error("No refresh token");
        }
        const refreshed = await axios.post<{
          tokens: { accessToken: string; refreshToken: string; accessExpiresIn: number };
        }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setTokens({
          accessToken: refreshed.data.tokens.accessToken,
          refreshToken: refreshed.data.tokens.refreshToken,
        });
        processQueue(refreshed.data.tokens.accessToken);
        original.headers.set(
          "Authorization",
          `Bearer ${refreshed.data.tokens.accessToken}`,
        );
        return api(original);
      } catch (refreshErr) {
        processQueue(null);
        useAuthStore.getState().clear();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    const body = err.response?.data;
    if (!body) return err.message;
    if (Array.isArray(body.message)) return body.message.join(". ");
    return body.message;
  }
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}
