import { api, toQueryString, type Paginated } from "./client";
import type { Role } from "./auth";

export type UserStatus = "active" | "inactive" | "pending";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListUsersParams = {
  role?: Role;
  status?: UserStatus;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: UserStatus;
};

export type UpdateUserInput = Partial<CreateUserInput>;

export const usersApi = {
  list: (params: ListUsersParams = {}) =>
    api<Paginated<UserSummary>>(`/users${toQueryString(params)}`),

  get: (id: string) => api<{ data: UserSummary }>(`/users/${id}`),

  create: (input: CreateUserInput) =>
    api<{ data: UserSummary }>("/users", { method: "POST", body: input }),

  update: (id: string, input: UpdateUserInput) =>
    api<{ data: UserSummary }>(`/users/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => api<null>(`/users/${id}`, { method: "DELETE" }),
};
