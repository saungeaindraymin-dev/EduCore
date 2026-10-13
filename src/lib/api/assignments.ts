import { api, downloadFile, toQueryString, type Paginated } from "./client";

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
  // Staff only — the API leaves these out for students
  submissions?: number; // handed in
  enrolled?: number; // active students on the course
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

export type SubmissionFile = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number; // bytes
  uploadedAt: string;
};

// What a student may attach — mirrors the API's allow-list
export const SUBMISSION_FILE_TYPES =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.png,.jpg,.jpeg,.gif,.webp";
export const MAX_SUBMISSION_FILES = 5;
export const MAX_SUBMISSION_FILE_BYTES = 10 * 1024 * 1024;

export type Submission = {
  id: string;
  assignmentId: string;
  student: { id: string; name: string; email: string };
  content: string; // may be empty when the work is all in files
  files: SubmissionFile[];
  score: number | null; // null until the teacher marks it
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  gradedBy: { id: string; name: string } | null;
  isLate: boolean;
};

/** A student's own submission, with the assignment it belongs to */
export type MySubmission = Submission & {
  assignment: {
    id: string;
    title: string;
    totalPoints: number;
    dueAt: string | null;
    course: { id: string; title: string; code: string };
  };
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

  // Students only. Each hand-in describes the whole submission: files not listed in
  // `keepFileIds` are removed. Allowed until the work is marked.
  submit: (
    assignmentId: string,
    input: { content: string; files?: File[]; keepFileIds?: string[] },
  ) => {
    const form = new FormData();
    form.set("content", input.content);
    form.set("keepFileIds", JSON.stringify(input.keepFileIds ?? []));
    for (const file of input.files ?? []) form.append("files", file);
    return api<{ data: Submission }>(`/assignments/${assignmentId}/submissions`, {
      method: "POST",
      body: form,
    });
  },

  // Students only: their own work. `graded` narrows to marked (true) or waiting (false).
  mySubmissions: (params: { graded?: boolean; limit?: number } = {}) =>
    api<{ data: MySubmission[] }>(
      `/submissions/mine${toQueryString({
        graded: params.graded === undefined ? undefined : String(params.graded),
        limit: params.limit,
      })}`,
    ),

  // The student who handed it in, the course's teacher and admins may download it
  downloadFile: (submissionId: string, file: SubmissionFile) =>
    downloadFile(`/submissions/${submissionId}/files/${file.id}`, file.fileName),

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
