import { api, toQueryString, type Paginated } from "./client";
import type { CourseStatus } from "./courses";

export const ENROLLMENT_STATUSES = ["active", "pending", "dropped"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export type Enrollment = {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  student: { id: string; name: string; email: string };
  course: { id: string; title: string; code: string; status: CourseStatus };
};

export type ListEnrollmentsParams = {
  q?: string;
  status?: EnrollmentStatus;
  courseId?: string;
  studentId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateEnrollmentInput = {
  studentId: string;
  courseId: string;
  status?: EnrollmentStatus;
};

// Changing courseId moves (transfers) the student to another course
export type UpdateEnrollmentInput = {
  courseId?: string;
  status?: EnrollmentStatus;
};

export const enrollmentsApi = {
  list: (params: ListEnrollmentsParams = {}) =>
    api<Paginated<Enrollment>>(`/enrollments${toQueryString(params)}`),

  get: (id: string) => api<{ data: Enrollment }>(`/enrollments/${id}`),

  create: (input: CreateEnrollmentInput) =>
    api<{ data: Enrollment }>("/enrollments", { method: "POST", body: input }),

  update: (id: string, input: UpdateEnrollmentInput) =>
    api<{ data: Enrollment }>(`/enrollments/${id}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: string) => api<null>(`/enrollments/${id}`, { method: "DELETE" }),
};
