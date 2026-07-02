const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("kazihq_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("kazihq_refresh_token");
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("kazihq_access_token", accessToken);
  localStorage.setItem("kazihq_refresh_token", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("kazihq_access_token");
  localStorage.removeItem("kazihq_refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  storeTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, raw = false } = options;

  const doFetch = async (token: string | null) => {
    const headers: Record<string, string> = {};
    if (!raw) headers["Content-Type"] = "application/json";
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;

    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let token = auth ? getAccessToken() : null;
  let res = await doFetch(token);

  if (res.status === 401 && auth) {
    token = await refreshAccessToken();
    if (token) res = await doFetch(token);
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const errBody = await res.json();
      message = Array.isArray(errBody.message) ? errBody.message.join(", ") : errBody.message ?? message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;

  if (raw) return (await res.blob()) as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  public: {
    get: <T>(path: string) => apiFetch<T>(path, { auth: false }),
    post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body, auth: false }),
  },
};
