import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  branchId: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (data: { accessToken: string; user: AuthUser }) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "medicontrol.auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);

export const selectIsAuthenticated = (s: AuthState): boolean =>
  s.accessToken !== null && s.user !== null;

export const selectHasRole = (role: string) => (s: AuthState): boolean =>
  s.user?.roles.includes(role) ?? false;

export const selectHasPermission =
  (permission: string) =>
  (s: AuthState): boolean =>
    s.user?.permissions.includes(permission) ?? false;
