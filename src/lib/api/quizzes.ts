import { api, toQueryString, type Paginated } from "./client";

export const QUIZ_STATUSES = ["draft", "published", "closed"] as const;
export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export const QUESTION_TYPES = ["single", "multiple", "true_false"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "One answer",
  multiple: "Several answers",
  true_false: "True / false",
};

export type QuizOption = {
  id: string;
  text: string;
  position: number;
  isCorrect?: boolean; // the marking key — the API withholds it from students
};

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  position: number;
  options: QuizOption[];
};

/** A student's own history on a quiz — the API sends these only to them */
export type MyQuizProgress = {
  myAttempts: number;
  attemptsLeft: number;
  bestScore: {
    score: number;
    maxScore: number;
    percentage: number;
    submittedAt: string;
  } | null;
};

export type Quiz = Partial<MyQuizProgress> & {
  id: string;
  title: string;
  description: string;
  status: QuizStatus;
  dueAt: string | null;
  timeLimitMinutes: number | null;
  attemptsAllowed: number;
  questions: number; // count
  attempts: number; // count
  course: { id: string; title: string; code: string };
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type QuizDetail = Omit<Quiz, "questions"> & {
  questions: QuizQuestion[];
};

/** What comes back the moment a student submits: marked, with the working shown */
export type MarkedAttempt = {
  id: string;
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  attemptsUsed: number;
  attemptsAllowed: number;
  questions: {
    questionId: string;
    chosenOptionIds: string[];
    correctOptionIds: string[];
    isCorrect: boolean;
    points: number;
    awarded: number;
  }[];
};

export type QuizAttempt = {
  id: string;
  student: { id: string; name: string; email: string };
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
  answers: {
    questionId: string;
    chosenOptionIds: string[];
    correctOptionIds: string[];
    isCorrect: boolean;
    points: number;
    awarded: number;
  }[];
};

export type QuizResults = {
  data: QuizAttempt[];
  meta: {
    attempts: number;
    students: number;
    averagePercentage: number | null;
    passRate: number | null;
  };
};

export type ListQuizzesParams = {
  q?: string;
  courseId?: string;
  teacherId?: string;
  status?: QuizStatus;
  page?: number;
  pageSize?: number;
};

export type CreateQuizInput = {
  title: string;
  description?: string;
  status?: QuizStatus;
  dueAt?: string | null;
  timeLimitMinutes?: number | null;
  attemptsAllowed?: number;
};

export type UpdateQuizInput = Partial<CreateQuizInput>;

export type QuestionInput = {
  type: QuestionType;
  text: string;
  points: number;
  options: { text: string; isCorrect: boolean }[];
};

export const quizzesApi = {
  list: (params: ListQuizzesParams = {}) =>
    api<Paginated<Quiz>>(`/quizzes${toQueryString(params)}`),

  get: (id: string) => api<{ data: QuizDetail }>(`/quizzes/${id}`),

  create: (courseId: string, input: CreateQuizInput) =>
    api<{ data: Quiz }>(`/courses/${courseId}/quizzes`, { method: "POST", body: input }),

  update: (id: string, input: UpdateQuizInput) =>
    api<{ data: Quiz }>(`/quizzes/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => api<null>(`/quizzes/${id}`, { method: "DELETE" }),

  // Questions carry the marking key, so only the course's teacher may touch them
  addQuestion: (quizId: string, input: QuestionInput) =>
    api<{ data: QuizQuestion }>(`/quizzes/${quizId}/questions`, {
      method: "POST",
      body: input,
    }),

  updateQuestion: (quizId: string, questionId: string, input: QuestionInput) =>
    api<{ data: QuizQuestion }>(`/quizzes/${quizId}/questions/${questionId}`, {
      method: "PATCH",
      body: input,
    }),

  removeQuestion: (quizId: string, questionId: string) =>
    api<null>(`/quizzes/${quizId}/questions/${questionId}`, { method: "DELETE" }),

  reorderQuestions: (quizId: string, questionIds: string[]) =>
    api<{ data: QuizDetail }>(`/quizzes/${quizId}/questions/order`, {
      method: "PUT",
      body: { questionIds },
    }),

  // Marked on submission; teachers and admins see the class, students only themselves
  results: (quizId: string) => api<QuizResults>(`/quizzes/${quizId}/attempts`),

  // Students only: sitting the quiz. The answer comes back marked.
  submitAttempt: (
    quizId: string,
    answers: { questionId: string; optionIds: string[] }[],
  ) =>
    api<{ data: MarkedAttempt }>(`/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: { answers },
    }),
};
