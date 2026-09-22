import { api } from "./client";

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  content: string;
  position: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LessonInput = {
  title: string;
  content?: string;
  published?: boolean;
};

const base = (courseId: string) => `/courses/${courseId}/lessons`;

export const lessonsApi = {
  list: (courseId: string) => api<{ data: Lesson[] }>(base(courseId)),

  create: (courseId: string, input: LessonInput) =>
    api<{ data: Lesson }>(base(courseId), { method: "POST", body: input }),

  update: (courseId: string, lessonId: string, input: Partial<LessonInput>) =>
    api<{ data: Lesson }>(`${base(courseId)}/${lessonId}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (courseId: string, lessonId: string) =>
    api<null>(`${base(courseId)}/${lessonId}`, { method: "DELETE" }),

  // Every lesson id in the course, in the new order
  reorder: (courseId: string, lessonIds: string[]) =>
    api<{ data: Lesson[] }>(`${base(courseId)}/order`, {
      method: "PUT",
      body: { lessonIds },
    }),
};
