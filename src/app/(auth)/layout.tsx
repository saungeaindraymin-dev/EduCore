import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="bg-brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur" />
          <span className="font-heading text-lg font-bold">EduCore</span>
        </Link>

        <div className="relative">
          <h2 className="font-heading text-4xl font-bold leading-tight">
            Learning, reimagined.
          </h2>
          <p className="mt-4 max-w-md text-white/90">
            The all-in-one platform for admins, teachers, and students to manage
            courses, assignments, and progress — beautifully.
          </p>
        </div>

        <p className="relative text-sm text-white/70">
          © {new Date().getFullYear()} EduCore. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
