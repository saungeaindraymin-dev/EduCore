import { api, toQueryString, type Paginated } from "./client";

export const COURSE_CATEGORIES = [
  "Mathematics",
  "Computer Science",
  "Science",
  "History",
  "Language",
  "Arts",
] as const;

export const COURSE_STATUSES = ["draft", "published", "inactive"] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export type Course = {
  id: string;
  title: string;
  code: string;
  category: CourseCategory;
  description: string | null;
  status: CourseStatus;
  teacher: { id: string; name: string } | null;
  students: number; // active enrollments
  lessons: number;
  createdAt: string;
};

export type ListCoursesParams = {
  q?: string;
  status?: CourseStatus;
  category?: CourseCategory;
  teacherId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateCourseInput = {
  title: string;
  code: string;
  category: CourseCategory;
  teacherId: string; // courses are created by admins, who assign the teacher
  description?: string;
};

export type UpdateCourseInput = Partial<Omit<CreateCourseInput, "description">> & {
  description?: string | null;
  status?: CourseStatus;
};

export const coursesApi = {
  list: (params: ListCoursesParams = {}) =>
    api<Paginated<Course>>(`/courses${toQueryString(params)}`),

  get: (id: string) => api<{ data: Course }>(`/courses/${id}`),

  create: (input: CreateCourseInput) =>
    api<{ data: Course }>("/courses", { method: "POST", body: input }),

  update: (id: string, input: UpdateCourseInput) =>
    api<{ data: Course }>(`/courses/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => api<null>(`/courses/${id}`, { method: "DELETE" }),
};
