import { useAuthStore } from "@/stores/useAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export type Paginated<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

type ErrorBody = {
  message?: string;
  error?: string;
  issues?: { path?: (string | number)[]; message?: string }[];
};

export function toQueryString(
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function api<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;
  // FormData goes as multipart — the browser sets the Content-Type with its boundary
  const isForm = body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = useAuthStore.getState().token;
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    // Never reuse a cached response: the API sends an ETag and no Cache-Control, so a
    // refetch right after a create/update/delete could otherwise come back stale.
    cache: "no-store",
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    credentials: "include", // keep this — it's fine as long as backend echoes origin
    mode: "cors",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    // Auto-logout on 401 for authenticated requests
    if (res.status === 401 && auth) useAuthStore.getState().logout();
    throw new ApiError(
      errorMessage(data, res.statusText),
      res.status,
      data?.issues,
    );
  }

  return data as T;
}

/**
 * Downloads a protected file. A plain link can't carry the Authorization header, so this
 * fetches it and hands the browser a temporary object URL to save.
 */
export async function downloadFile(path: string, fileName: string) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;
    if (res.status === 401) useAuthStore.getState().logout();
    throw new ApiError(errorMessage(data, res.statusText), res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before letting go of the blob
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Backend errors look like { message }, { error: "ValidationError", issues } or { error }
function errorMessage(data: ErrorBody | null, fallback: string) {
  if (data?.message) return data.message;
  const issue = data?.issues?.[0];
  if (issue?.message) {
    const field = issue.path?.join(".");
    return field ? `${field}: ${issue.message}` : issue.message;
  }
  return data?.error ?? fallback;
}
