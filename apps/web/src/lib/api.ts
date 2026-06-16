import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

// En desarrollo usa el proxy de Vite (/api/v1 → localhost:3000/api/v1)
// En produccion se configura con VITE_API_URL
const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "/api/v1";

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
        const refreshed = await api.post<{
          tokens: { accessToken: string; accessExpiresIn: number };
        }>("/auth/refresh", {});
        useAuthStore.getState().setAccessToken(refreshed.data.tokens.accessToken);
        processQueue(refreshed.data.tokens.accessToken);
        original.headers.set("Authorization", `Bearer ${refreshed.data.tokens.accessToken}`);
        return api(original);
      } catch (refreshErr) {
        processQueue(null);
        useAuthStore.getState().clear();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
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
