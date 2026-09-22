import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-sub">
          Welcome back — here&apos;s what&apos;s happening today.
        </p>
      </header>

      {/* Stats */}
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value="2,847"
          delta={{ value: "12.5%", positive: true }}
          icon={<IconUser />}
        />
        <StatCard
          label="Active Courses"
          value="184"
          delta={{ value: "4.2%", positive: true }}
          icon={<IconBook />}
        />
        <StatCard
          label="Teachers"
          value="96"
          delta={{ value: "2 new", positive: true }}
          icon={<IconAcademic />}
        />
        <StatCard
          label="Revenue"
          value="$48.2K"
          delta={{ value: "1.8%", positive: false }}
          icon={<IconCurrency />}
        />
      </section>

      {/* Two-column: recent activity + upcoming */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Recent enrollments
            </h2>
            <a
              href="/enrollments"
              className="text-sm font-medium text-brand-indigo hover:underline"
            >
              View all
            </a>
          </div>

          <ul className="divide-y divide-border-soft">
            {RECENT.map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3">
                <div className="bg-brand-gradient h-9 w-9 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.name}
                  </p>
                  <p className="truncate text-xs text-sub">
                    enrolled in {r.course}
                  </p>
                </div>
                <StatusPill status={r.status} />
                <span className="text-xs text-sub">{r.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm">
          <h2 className="font-heading mb-4 text-lg font-semibold text-ink">
            Upcoming classes
          </h2>
          <ul className="space-y-3">
            {UPCOMING.map((u) => (
              <li
                key={u.id}
                className="rounded-lg border border-border-soft p-3"
              >
                <p className="text-sm font-medium text-ink">{u.title}</p>
                <p className="mt-0.5 text-xs text-sub">
                  {u.teacher} · {u.time}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

const RECENT = [
  {
    id: 1,
    name: "Sarah Johnson",
    course: "Advanced Algebra",
    status: "active",
    time: "2h ago",
  },
  {
    id: 2,
    name: "Michael Chen",
    course: "Intro to Python",
    status: "pending",
    time: "4h ago",
  },
  {
    id: 3,
    name: "Aisha Patel",
    course: "World History",
    status: "active",
    time: "5h ago",
  },
  {
    id: 4,
    name: "Diego Ramírez",
    course: "Organic Chemistry",
    status: "active",
    time: "1d ago",
  },
  {
    id: 5,
    name: "Emma Williams",
    course: "English Literature",
    status: "inactive",
    time: "2d ago",
  },
];

const UPCOMING = [
  {
    id: 1,
    title: "Calculus II",
    teacher: "Dr. Nguyen",
    time: "Today, 2:00 PM",
  },
  {
    id: 2,
    title: "Web Development",
    teacher: "Prof. Alvarez",
    time: "Tomorrow, 10:00 AM",
  },
  { id: 3, title: "Physics Lab", teacher: "Dr. Okafor", time: "Wed, 1:30 PM" },
];

function IconUser() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}
function IconBook() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}
function IconAcademic() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
      />
    </svg>
  );
}
function IconCurrency() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.25 0-4.5-1.5-4.5-3.75s2.25-3.75 4.5-3.75c1.036 0 1.964.276 2.678.75L15 6"
      />
    </svg>
  );
}
