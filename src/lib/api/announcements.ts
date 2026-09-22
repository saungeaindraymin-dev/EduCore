import { api, toQueryString, type Paginated } from "./client";

export const ANNOUNCEMENT_AUDIENCES = ["all", "teachers", "students", "course"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

// Derived by the API from publishedAt: null = draft, future = scheduled, past = published
export type AnnouncementStatus = "draft" | "scheduled" | "published";

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Everyone",
  teachers: "Teachers",
  students: "Students",
  course: "Course",
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  course: { id: string; title: string; code: string } | null;
  publishedAt: string | null;
  status: AnnouncementStatus;
  author: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAnnouncementsParams = {
  q?: string;
  status?: AnnouncementStatus;
  audience?: AnnouncementAudience;
  courseId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateAnnouncementInput = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  courseId?: string; // required when audience is "course"
  publishedAt?: string | null; // null = draft
};

export type UpdateAnnouncementInput = {
  title?: string;
  body?: string;
  audience?: AnnouncementAudience;
  courseId?: string | null;
  publishedAt?: string | null;
};

export const announcementsApi = {
  list: (params: ListAnnouncementsParams = {}) =>
    api<Paginated<Announcement>>(`/announcements${toQueryString(params)}`),

  get: (id: string) => api<{ data: Announcement }>(`/announcements/${id}`),

  create: (input: CreateAnnouncementInput) =>
    api<{ data: Announcement }>("/announcements", { method: "POST", body: input }),

  update: (id: string, input: UpdateAnnouncementInput) =>
    api<{ data: Announcement }>(`/announcements/${id}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: string) => api<null>(`/announcements/${id}`, { method: "DELETE" }),
};
