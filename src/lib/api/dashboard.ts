import { api } from "./client";
import type { EnrollmentStatus } from "./enrollments";

/** Today's count and how many of those already existed 30 days ago */
export type Trend = { total: number; monthAgo: number };

export type AdminOverview = {
  generatedAt: string;
  stats: {
    students: Trend;
    teachers: Trend;
    courses: {
      draft: number;
      published: number;
      inactive: number;
      total: number;
      publishedMonthAgo: number;
    };
    enrollments: { active: number; activeMonthAgo: number; pending: number };
    work: {
      openAssignments: number;
      awaitingMarking: number;
      publishedQuizzes: number;
      quizAttemptsThisMonth: number;
    };
  };
  attention: {
    pendingEnrollments: number;
    coursesWithoutTeacher: number;
    draftCourses: number;
    awaitingMarking: number;
  };
  recentEnrollments: {
    id: string;
    status: EnrollmentStatus;
    enrolledAt: string;
    student: { id: string; name: string };
    course: { id: string; title: string; code: string };
  }[];
  upcomingClasses: {
    id: string;
    title: string;
    start: string;
    end: string;
    location: string | null;
    course: { id: string; title: string; code: string };
    teacher: { id: string; name: string } | null;
  }[];
  topCourses: {
    id: string;
    title: string;
    code: string;
    teacher: { id: string; name: string } | null;
    activeStudents: number;
  }[];
};

export const dashboardApi = {
  // Institute-wide figures — admins only
  admin: () => api<{ data: AdminOverview }>("/dashboard/admin"),
};
