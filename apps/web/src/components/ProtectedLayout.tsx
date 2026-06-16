import type { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

interface Props {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export default function ProtectedLayout({
  children,
  requiredRoles,
  requiredPermissions,
}: Props) {
  return (
    <ProtectedRoute
      requiredRoles={requiredRoles}
      requiredPermissions={requiredPermissions}
    >
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
