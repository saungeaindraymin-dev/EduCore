export function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: { value: string; positive?: boolean };
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-sub">{label}</p>
          <p className="font-heading mt-2 text-3xl font-bold text-ink">
            {value}
          </p>
        </div>
        <div className="bg-brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-brand">
          {icon}
        </div>
      </div>
      {delta && (
        <p className="mt-2 text-xs text-sub">
          <span
            className={`font-semibold ${delta.positive ? "text-success" : "text-danger"}`}
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>{" "}
          vs last month
        </p>
      )}
    </div>
  );
}
