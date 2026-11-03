import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface BrandingInfo {
  name: string;
  legalName: string;
  displayName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () => {
      const { data } = await api.get<BrandingInfo>("/branding");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
