import { api } from "./client";
import type { Role } from "./auth";

export type NavIconName =
  | "grid"
  | "users"
  | "book"
  | "clipboard"
  | "calendar"
  | "megaphone"
  | "user-group";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: NavIconName;
  comingSoon?: boolean; // shown but not clickable yet
};

export type Access = {
  role: Role;
  permissions: string[];
  navigation: NavItem[];
};

export const accessApi = {
  // 401 when the session is stale (role changed, account deactivated) → the client signs out
  get: () => api<{ data: Access }>("/me/access"),
};
