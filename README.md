# EduCore — Learning Management System (Web)

A full learning management system for an institute, built from scratch with Next.js, TypeScript and Tailwind CSS. One app serves three dashboards — admin, teacher and student — each with its own menu, its own pages and its own permissions. Courses, lessons, enrollments, timetables, announcements, assignments with file hand-ins, and auto-marked quizzes.

**Repository:** https://github.com/saungeaindraymin-dev/EduCore
**API:** https://github.com/saungeaindraymin-dev/EduCore-Api (Express + Prisma + Neon Postgres)
**Live demo:** not deployed yet

## Core Features

- **Three dashboards, one app:** `/dashboard` (admin), `/teacher` and `/student` each have their own layout, stats and pages. The sidebar is not hard-coded — it comes from `GET /api/me/access`, so a role only ever sees what its permissions allow.
- **Permissions modelled on a real institute:** admins run the institute (users, courses, enrollments, timetable) but never author or mark course work; teachers own the teaching of their own courses (lessons, assignments, quizzes, marking, announcements) but cannot create or delete a course; students only ever see their own enrolled courses, their own work and their own marks.
- **Courses and lessons:** admins create courses and assign a teacher; teachers write the lessons (reorder, publish, optional video link — YouTube and Vimeo play inline), students read the published ones.
- **Assignments with file hand-ins:** teachers set work with points and a deadline; students hand in text and up to 5 files (PDF, Office, images, zip — 10 MB each); teachers open the submissions dialog, download what was handed in, and enter a score and feedback. Students see the mark, the comment and their own files back on their dashboard.
- **Quizzes, marked automatically:** teachers build multiple-choice and multi-answer questions with the answer key; students sit the quiz with a countdown; the score, the per-question breakdown and the class results appear immediately — nothing is marked by hand.
- **Weekly timetable:** the same Mon–Sun grid for all three roles — admins create and edit classes, teachers and students read theirs, with week navigation, course filters, class and hour counts, and in-progress / past styling.
- **Announcements:** admins post to everyone, to teachers or to students; teachers post to their own courses; students read a filtered feed. Drafts, scheduling and a "New" badge for the last 7 days.
- **Live admin dashboard:** every figure comes from the database in one request — totals with growth against 30 days ago, work waiting to be marked, courses without a teacher, enrollments waiting for approval, top courses and upcoming classes.
- **Lists that behave:** search, filters and paging are server-side on every list and debounced, and the rows already on screen stay there while the next page loads, so a table never flashes empty.
- **One loading look:** a single shimmering placeholder system (`src/components/Skeleton.tsx`) covers tables, lists, cards, panels, stat figures, form dropdowns and whole pages. Nothing anywhere prints "Loading…".
- **Auth flow:** email + password sign-in, sign-up, and a forgotten-password journey through an emailed one-time code to a password reset. The session is held in a persisted store; `RequireRole` gates every dashboard page, and a middleware bounces anyone without a token cookie away from `/teacher` and `/student`.

## Tech Stack

- **Framework:** Next.js 16 (App Router) / React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 — design tokens (`@theme`) in `globals.css`, no raw hex in components
- **Components:** shadcn/ui built on `@base-ui/react`, restyled onto the EduCore tokens
- **State:** Zustand for the session (persisted to localStorage); plain React elsewhere
- **Forms:** React Hook Form + Zod (`zodResolver`)
- **Data:** a small typed API client over `fetch` (`src/lib/api`) + a `useApiQuery` hook — keeps stale data while refetching, exposes `reload()`
- **Fonts / icons:** Poppins headings, Inter body (`next/font`); hand-drawn SVG icon set (`NavIcon`)
- **Package manager:** npm

## Folder Structure

```
src/
├── app/                                # Next.js App Router
│   ├── (marketing)/                    # "/" landing, /terms, /privacy
│   ├── (auth)/                         # /login, /forgot-password, /verify-otp, /change-password
│   ├── (admin)/                        # admin area (RequireRole + AppShell)
│   │   ├── dashboard/page.tsx          # live figures from /api/dashboard/admin
│   │   ├── users|courses|enrollments/  # management tables
│   │   ├── assignments/page.tsx        # oversight: status, delete, who handed in
│   │   ├── schedule|announcements/
│   │   └── _components/                # UserFormModal, EnrollmentFormModal, ScheduleFormModal, DataTable
│   ├── teacher/                        # teacher area
│   │   ├── page.tsx                    # dashboard
│   │   ├── courses/[id]/page.tsx       # tabs: Lessons / Students / Schedule
│   │   ├── assignments|quizzes/        # author, publish, mark
│   │   ├── students|schedule|announcements/
│   │   └── _components/                # LessonsPanel, QuizResultsPanel, form modals…
│   └── student/                        # student area
│       ├── page.tsx                    # dashboard + teacher feedback
│       ├── courses/[id]/page.tsx       # tabs: Lessons / Work / Classes
│       ├── assignments/[id]/page.tsx   # hand-in page (text + files)
│       ├── quizzes/[id]/page.tsx       # sit the quiz, see the mark
│       └── _components/                # LessonReader, QuizRunner, FeedbackPanels…
├── components/
│   ├── shell/                          # AppShell, Sidebar (API-driven menu), Topbar, NavIcon
│   ├── ui/                             # shadcn primitives (button, dialog, input…)
│   ├── Skeleton.tsx                    # the one loading look, for every state
│   ├── StatCard.tsx  StatusPill.tsx  Pagination.tsx  ConfirmDialog.tsx
│   ├── CourseFormModal.tsx  AnnouncementFormModal.tsx  ClassDetailsDialog.tsx
│   ├── SubmissionsDialog.tsx           # shared: teachers mark, admins read only
│   └── RequireRole.tsx                 # client-side role gate
├── hooks/
│   ├── useApiQuery.ts                  # fetch + reload, keeps stale data
│   └── useDebouncedValue.ts            # search boxes
├── lib/
│   ├── api/                            # one typed module per resource
│   │   ├── client.ts                   # fetch wrapper, ApiError, FormData + downloads
│   │   └── auth|users|courses|lessons|enrollments|schedule|
│   │       announcements|assignments|quizzes|students|dashboard|access.ts
│   ├── dates.ts                        # week maths and local-time formatting
│   ├── video.ts                        # YouTube / Vimeo link → embed URL
│   └── validators/                     # Zod schemas for the auth forms
├── stores/useAuthStore.ts              # session, persisted
├── app/globals.css                     # Tailwind v4 @theme tokens + .skeleton
└── middleware.ts                       # /teacher and /student: no token cookie → /login?next=…
```

## Setup

The API must be running first — see the [EduCore API](https://github.com/saungeaindraymin-dev/EduCore-Api) README.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

`.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Sign in with a seeded account (`pnpm db:seed` in the API repo):

| Role | Email | Password |
|---|---|---|
| Admin | admin@educore.app | Admin@123 |
| Teacher | teacher@educore.app | Teacher@123 |
| Student | student@educore.app | Student@123 |

## Routes

| Route | Who | What it shows |
|---|---|---|
| `/` | anyone | Landing page, terms and privacy |
| `/login` | anyone | Sign in; forgotten password runs through an emailed OTP |
| `/dashboard` | admin | Live institute figures, needs-attention list, top courses |
| `/users` `/courses` `/enrollments` | admin | Management tables — search, filters, paging, create / edit / delete |
| `/assignments` | admin | Oversight: status and deletion, and who has handed in per course |
| `/schedule` `/announcements` | admin | Weekly timetable and the announcement feed, both editable |
| `/teacher` | teacher | Their week: classes, announcements, courses, recent enrollments |
| `/teacher/courses/[id]` | teacher | Lessons (write, reorder, publish), students, classes |
| `/teacher/assignments` `/teacher/quizzes` | teacher | Author, publish and mark their own work |
| `/teacher/students` | teacher | Read-only roster of the students in their courses |
| `/student` | student | What's due, announcements, and their teachers' feedback |
| `/student/courses/[id]` | student | Lessons, the work set for the course, and its classes |
| `/student/assignments/[id]` | student | Hand in text and files, then read the mark and feedback |
| `/student/quizzes/[id]` | student | Sit the quiz and see the result straight away |
