import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
          <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#64748B]">
            New — AI-assisted grading is live
          </span>
          <h1 className="font-heading mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Learning, <span className="text-brand-gradient">reimagined</span>{" "}
            for modern classrooms.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#64748B]">
            EduCore is the all-in-one platform where administrators, teachers,
            and students manage courses, assignments, and progress —
            beautifully.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-brand-gradient rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90"
            >
              Start free trial
            </Link>
            <Link
              href="#features"
              className="rounded-lg border border-[#E2E8F0] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            Everything your school needs
          </h2>
          <p className="mt-3 text-[#64748B]">
            One platform for admins, teachers, and students.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="bg-brand-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
                {f.icon}
              </div>
              <h3 className="font-heading mt-4 text-lg font-semibold">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-[#64748B]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="bg-brand-gradient overflow-hidden rounded-3xl p-10 text-center text-white md:p-16">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            Ready to transform your classroom?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Join schools using EduCore to streamline learning.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#6366F1] shadow-md hover:bg-white/95"
          >
            Get started free
          </Link>
        </div>
      </section>
    </>
  );
}

const FEATURES = [
  {
    title: "Course Management",
    desc: "Create, organize, and publish courses with rich content and structured lessons.",
    icon: <IconBook />,
  },
  {
    title: "Assignments & Grading",
    desc: "Assign work, collect submissions, and grade with AI-assisted feedback.",
    icon: <IconCheck />,
  },
  {
    title: "Real-time Analytics",
    desc: "Track student progress and course performance with live dashboards.",
    icon: <IconChart />,
  },
];

// Heroicons v2 outline (MIT)
function IconBook() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}
function IconChart() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}
