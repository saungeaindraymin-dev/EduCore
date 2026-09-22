import { api, toQueryString } from "./client";

export type ScheduleEvent = {
  id: string;
  title: string;
  start: string; // ISO timestamp (UTC)
  end: string;
  location: string | null;
  course: { id: string; title: string; code: string };
  teacher: { id: string; name: string } | null;
  createdAt: string;
};

export type ListScheduleParams = {
  from: string;
  to: string;
  courseId?: string;
  teacherId?: string;
  studentId?: string;
};

export type CreateScheduleInput = {
  courseId: string;
  teacherId?: string; // defaults to the course's teacher
  title?: string; // defaults to the course title
  start: string;
  end: string;
  location?: string;
  repeatWeeks?: number; // 1 = a single class
};

export type UpdateScheduleInput = {
  courseId?: string;
  teacherId?: string | null; // null = use the course's teacher
  title?: string;
  start?: string;
  end?: string;
  location?: string | null;
};

export const scheduleApi = {
  list: (params: ListScheduleParams) =>
    api<{ data: ScheduleEvent[] }>(`/schedule${toQueryString(params)}`),

  get: (id: string) => api<{ data: ScheduleEvent }>(`/schedule/${id}`),

  // Returns every created class (more than one when repeating weekly)
  create: (input: CreateScheduleInput) =>
    api<{ data: ScheduleEvent[] }>("/schedule", { method: "POST", body: input }),

  update: (id: string, input: UpdateScheduleInput) =>
    api<{ data: ScheduleEvent }>(`/schedule/${id}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: string) => api<null>(`/schedule/${id}`, { method: "DELETE" }),
};
