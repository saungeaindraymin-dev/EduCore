"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ScheduleEvent } from "@/lib/api/schedule";
import { formatFullDate, formatTime } from "@/lib/dates";

/**
 * Read-only details for one class — nobody but an admin changes the timetable.
 * Pass `teacherId` from a teacher's own session to get the "covering for you" note.
 */
export function ClassDetailsDialog({
  event,
  onClose,
  teacherId,
  courseHref,
}: {
  event: ScheduleEvent | null;
  onClose: () => void;
  teacherId?: string;
  courseHref: string | null;
}) {
  const start = event ? new Date(event.start) : null;
  const end = event ? new Date(event.end) : null;
  const coveredBy =
    teacherId && event?.teacher && event.teacher.id !== teacherId
      ? event.teacher.name
      : null;

  return (
    <Dialog open={!!event} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {event && start && end && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{event.title}</DialogTitle>
              <DialogDescription>
                {formatFullDate(start)} · {formatTime(start)} – {formatTime(end)}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-3 text-sm">
              <Row label="Course">
                {event.course.title}{" "}
                <span className="text-sub">({event.course.code})</span>
              </Row>
              <Row label="Location">
                {event.location ?? <span className="text-sub">Not set</span>}
              </Row>
              <Row label="Teacher">
                {event.teacher ? (
                  <>
                    {event.teacher.name}
                    {coveredBy && <span className="text-sub"> · covering for you</span>}
                  </>
                ) : (
                  <span className="text-sub">Unassigned</span>
                )}
              </Row>
            </dl>

            <p className="text-xs text-sub">
              Classes are scheduled by an administrator. Ask them for a change.
            </p>

            <DialogFooter>
              {courseHref && (
                <Link
                  href={courseHref}
                  className="inline-flex h-8 items-center rounded-lg border border-border-soft bg-surface px-3 text-sm font-medium text-ink hover:bg-field"
                >
                  Open course
                </Link>
              )}
              <Button
                type="button"
                onClick={onClose}
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-xs font-medium uppercase tracking-wider text-sub">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}
