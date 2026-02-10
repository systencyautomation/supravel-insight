import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { FloatingChat } from "./FloatingChat";

const HIDDEN_PATHS = ["/auth", "/onboarding", "/join", "/master"];

export function FloatingChatWrapper() {
  const { user, userRoles, effectiveOrgId } = useAuth();
  const location = useLocation();

  // Don't show on certain pages
  if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  // Must be logged in with an org
  if (!user || !effectiveOrgId) return null;

  // Check role: admin or manager only
  const role = userRoles.find((r) => r.organization_id === effectiveOrgId)?.role;
  if (!role || !["admin", "manager", "super_admin", "saas_admin"].includes(role)) return null;

  return <FloatingChat />;
}
