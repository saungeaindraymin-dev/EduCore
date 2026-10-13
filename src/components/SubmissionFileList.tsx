"use client";

import { useState } from "react";
import { assignmentsApi, type SubmissionFile } from "@/lib/api/assignments";
import { ApiError } from "@/lib/api/client";

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** A short badge for the file type: "PDF", "DOCX", "PNG"… */
export function fileBadge(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "FILE" : fileName.slice(dot + 1).toUpperCase().slice(0, 4);
}

/**
 * Files handed in with a submission, each downloadable. The student's own editor passes
 * `removed`/`onToggleRemove` to mark files that won't be kept on the next hand-in.
 */
export function SubmissionFileList({
  submissionId,
  files,
  removed,
  onToggleRemove,
}: {
  submissionId: string;
  files: SubmissionFile[];
  removed?: Set<string>;
  onToggleRemove?: (fileId: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (files.length === 0) return null;

  const download = async (file: SubmissionFile) => {
    setBusyId(file.id);
    setError(null);
    try {
      await assignmentsApi.downloadFile(submissionId, file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download the file");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {files.map((file) => {
          const isRemoved = removed?.has(file.id) ?? false;
          return (
            <li
              key={file.id}
              className={`flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-3 py-2 ${
                isRemoved ? "opacity-50" : ""
              }`}
            >
              <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold tracking-wide text-brand-indigo">
                {fileBadge(file.fileName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium text-ink ${isRemoved ? "line-through" : ""}`}>
                  {file.fileName}
                </p>
                <p className="text-xs text-sub">
                  {formatBytes(file.size)}
                  {isRemoved && " · will be removed when you hand in"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(file)}
                disabled={busyId === file.id}
                className="shrink-0 text-sm font-medium text-brand-indigo hover:underline disabled:opacity-50"
              >
                {busyId === file.id ? "Downloading…" : "Download"}
              </button>
              {onToggleRemove && (
                <button
                  type="button"
                  onClick={() => onToggleRemove(file.id)}
                  className={`shrink-0 text-sm font-medium hover:underline ${
                    isRemoved ? "text-sub" : "text-danger"
                  }`}
                >
                  {isRemoved ? "Keep" : "Remove"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
