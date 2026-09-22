import { api, toQueryString, type Paginated } from "./client";

export const ASSIGNMENT_STATUSES = ["draft", "published", "closed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export type Assignment = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null; // null = no deadline
  totalPoints: number;
  status: AssignmentStatus;
  course: { id: string; title: string; code: string };
  createdBy: { id: string; name: string } | null; // the teacher who set it
  createdAt: string;
  updatedAt: string;
};

export type ListAssignmentsParams = {
  q?: string;
  courseId?: string;
  teacherId?: string;
  status?: AssignmentStatus;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  pageSize?: number;
};

export type CreateAssignmentInput = {
  title: string;
  description?: string;
  dueAt?: string | null;
  totalPoints?: number;
  status?: AssignmentStatus;
};

export type UpdateAssignmentInput = Partial<CreateAssignmentInput>;

export type Submission = {
  id: string;
  assignmentId: string;
  student: { id: string; name: string; email: string };
  content: string;
  score: number | null; // null until the teacher marks it
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  gradedBy: { id: string; name: string } | null;
  isLate: boolean;
};

export type SubmissionList = {
  data: Submission[];
  meta: {
    submissions: number;
    graded: number;
    awaitingMarking: number;
    late: number;
    enrolled?: number; // teachers and admins only
    notSubmitted?: number;
    totalPoints: number;
    averageScore: number | null;
  };
};

export const assignmentsApi = {
  // Scoped by role: admins see every course, teachers their own, students published work
  // in courses they're enrolled in
  list: (params: ListAssignmentsParams = {}) =>
    api<Paginated<Assignment>>(`/assignments${toQueryString(params)}`),

  get: (id: string) => api<{ data: Assignment }>(`/assignments/${id}`),

  // Only the teacher who runs the course may set its assignments
  create: (courseId: string, input: CreateAssignmentInput) =>
    api<{ data: Assignment }>(`/courses/${courseId}/assignments`, {
      method: "POST",
      body: input,
    }),

  // Teachers edit their own work; an admin may only change `status`
  update: (id: string, input: UpdateAssignmentInput) =>
    api<{ data: Assignment }>(`/assignments/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => api<null>(`/assignments/${id}`, { method: "DELETE" }),

  // Students only: handing work in again replaces what they had, until it's marked
  submit: (assignmentId: string, content: string) =>
    api<{ data: Submission }>(`/assignments/${assignmentId}/submissions`, {
      method: "POST",
      body: { content },
    }),

  // Teachers and admins get the class; a student gets only their own
  submissions: (assignmentId: string) =>
    api<SubmissionList>(`/assignments/${assignmentId}/submissions`),

  // Only the teacher who runs the course may mark
  grade: (submissionId: string, input: { score: number; feedback?: string | null }) =>
    api<{ data: Submission }>(`/submissions/${submissionId}/grade`, {
      method: "PATCH",
      body: input,
    }),
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};
