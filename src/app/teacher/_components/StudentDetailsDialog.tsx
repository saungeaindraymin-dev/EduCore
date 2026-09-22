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
import { StatusPill } from "@/components/StatusPill";
import type { Student } from "@/lib/api/students";
import { initials } from "@/lib/utils";

/** Read-only: what this student takes with the signed-in teacher. */
export function StudentDetailsDialog({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!student} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {student && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{student.name}</DialogTitle>
              <DialogDescription>
                <a href={`mailto:${student.email}`} className="hover:underline">
                  {student.email}
                </a>
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-field/60 p-3">
              <div className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                {initials(student.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  {student.activeCourses} active of {student.courses.length} enrolled
                </p>
                <p className="text-xs text-sub">In courses you teach</p>
              </div>
              <StatusPill status={student.status} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-sub">
                Enrollments
              </h3>
              <ul className="divide-y divide-border-soft rounded-xl border border-border-soft">
                {student.courses.map((c) => (
                  <li key={c.enrollmentId} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/teacher/courses/${c.id}`}
                        onClick={onClose}
                        className="block truncate text-sm font-medium text-ink hover:text-brand-indigo hover:underline"
                      >
                        {c.title}
                      </Link>
                      <p className="text-xs text-sub">
                        {c.code} · enrolled {c.enrolledAt.slice(0, 10)}
                      </p>
                    </div>
                    <StatusPill status={c.enrollmentStatus} />
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-sub">
              Enrollments are managed by an administrator. Ask them to add, drop or
              move a student.
            </p>

            <DialogFooter>
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
