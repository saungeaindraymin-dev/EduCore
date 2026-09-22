export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between border-t border-border-soft px-6 py-4">
      <p className="text-sm text-sub">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-md border border-border-soft px-3 py-1.5 text-sm text-ink disabled:opacity-40 hover:bg-field"
        >
          Previous
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-8 w-8 rounded-md text-sm font-medium ${
              p === page
                ? "bg-brand-gradient text-white"
                : "text-sub hover:bg-field"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="rounded-md border border-border-soft px-3 py-1.5 text-sm text-ink disabled:opacity-40 hover:bg-field"
        >
          Next
        </button>
      </div>
    </div>
  );
}
