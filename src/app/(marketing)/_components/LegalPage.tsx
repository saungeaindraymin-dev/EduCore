export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b border-[#E2E8F0] pb-8">
        <h1 className="font-heading text-4xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-[#64748B]">Last updated: {updated}</p>
      </header>
      <div className="prose-legal mt-8 space-y-6 text-[#0F172A]">{children}</div>
    </article>
  );
}