import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-brand-gradient h-8 w-8 rounded-lg" />
          <span className="font-heading text-lg font-bold text-[#0F172A]">
            EduCore
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            Pricing
          </Link>
          <Link
            href="/terms"
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            Privacy
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[#0F172A] hover:text-[#6366F1]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-brand-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-brand-gradient h-7 w-7 rounded-md" />
            <span className="font-heading text-base font-bold">EduCore</span>
          </div>
          <p className="mt-3 text-sm text-[#64748B]">
            A modern LMS built for schools, teachers, and students.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            ["Features", "#features"],
            ["Pricing", "#pricing"],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ["Terms of Service", "/terms"],
            ["Privacy Policy", "/privacy"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["About", "#"],
            ["Contact", "#"],
          ]}
        />
      </div>
      <div className="border-t border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-6 py-6 text-sm text-[#64748B]">
          © {new Date().getFullYear()} EduCore. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h4 className="font-heading text-sm font-semibold text-[#0F172A]">
        {title}
      </h4>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-[#64748B] hover:text-[#0F172A]"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
