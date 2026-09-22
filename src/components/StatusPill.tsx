const STYLES: Record<string, string> = {
  active: "bg-success-bg text-success",
  inactive: "bg-danger-bg text-danger",
  pending: "bg-warning-bg text-warning",
  draft: "bg-slate-100 text-slate-600",
  published: "bg-info-bg text-info",
  dropped: "bg-slate-100 text-slate-500",
  scheduled: "bg-violet-50 text-violet-600",
  closed: "bg-warning-bg text-warning",
};

export function StatusPill({
  status,
}: {
  status: keyof typeof STYLES | string;
}) {
  const cls = STYLES[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {status}
    </span>
  );
}
