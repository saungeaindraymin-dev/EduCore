import { api, toQueryString, type Paginated } from "./client";
import type { EnrollmentStatus } from "./enrollments";
import type { UserStatus } from "./users";

export type StudentCourse = {
  id: string;
  title: string;
  code: string;
  enrollmentId: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  status: UserStatus; // the account, not the enrollment
  courses: StudentCourse[]; // only the ones the signed-in user may see
  activeCourses: number;
  lastEnrolledAt: string | null;
};

export type ListStudentsParams = {
  q?: string;
  courseId?: string;
  status?: EnrollmentStatus;
  page?: number;
  pageSize?: number;
};

export const studentsApi = {
  // Read-only: admins see every student, teachers only students in their own courses
  list: (params: ListStudentsParams = {}) =>
    api<Paginated<Student>>(`/students${toQueryString(params)}`),
};
