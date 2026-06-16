import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user?: AuthUser;
  tokens?: { accessToken: string; refreshToken: string; accessExpiresIn: number };
  mfaRequired?: boolean;
  mfaToken?: string;
}

async function loginRequest(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", input);
  return data;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      if (data.tokens && data.user) {
        setSession({ accessToken: data.tokens.accessToken, user: data.user });
      }
    },
  });
}

export function useVerifyMfaLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: { mfaToken: string; code: string }) => {
      const { data } = await api.post<LoginResponse>("/auth/mfa/verify-login", input);
      return data;
    },
    onSuccess: (data) => {
      if (data.tokens && data.user) {
        setSession({ accessToken: data.tokens.accessToken, user: data.user });
      }
    },
  });
}

async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export function useMe(enabled: boolean) {
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: meRequest,
    enabled,
    retry: false,
    staleTime: 60_000,
  }).data satisfies AuthUser | undefined;
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout", {});
    },
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}

export { extractErrorMessage };
