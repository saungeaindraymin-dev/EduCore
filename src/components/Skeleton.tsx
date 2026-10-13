import { cn } from "@/lib/utils";

/**
 * EduCore has one loading look: a soft shimmering block where the content will land.
 * Nothing should ever print "Loading…" — build the placeholder out of these instead,
 * sized and shaped like the thing it stands in for.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-12 rounded-lg", className)} />;
}

/** Placeholder for a short run of text — a count, a meta line. Sits on the text baseline. */
export function SkeletonText({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("skeleton inline-block h-4 w-24 rounded-md align-middle", className)}
    />
  );
}

/** Stands in for a form control whose options are still loading. */
export function SkeletonField({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full rounded-lg", className)} />;
}

/** The body of a panel that is still loading. */
export function SkeletonStack({
  rows = 3,
  className,
  rowClassName,
}: {
  rows?: number;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className={cn("space-y-2", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
}

/** Placeholder items for a list that brings its own <ul>/<ol>. */
export function SkeletonItems({
  rows = 3,
  itemClassName,
  className,
}: {
  rows?: number;
  itemClassName?: string;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        // Decoration only: a role here would break the list's semantics, and the
        // real content announces itself once it lands
        <li key={`skeleton-${i}`} aria-hidden className={itemClassName}>
          <Skeleton className={className} />
        </li>
      ))}
    </>
  );
}

/** Placeholder rows for a table that is still loading. */
export function SkeletonRows({
  rows = 5,
  columns,
  className,
}: {
  rows?: number;
  columns: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={`skeleton-${i}`} aria-hidden>
          <td colSpan={columns} className="px-6 py-4">
            <Skeleton className={cn("h-9", className)} />
          </td>
        </tr>
      ))}
    </>
  );
}

/** A whole page whose main content hasn't arrived yet — used by the detail routes. */
export function SkeletonPage({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("space-y-6", className)}>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
