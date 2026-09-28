import type { ProxyStatus, SettingsResp } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// توکن ادمین همان ADMIN_TOKEN سمت سرور است (کاربر ادمین جدا در MVP نداریم).
const TOKEN_KEY = "mathmotion_admin_token";

// ---------- مدیریت توکن ----------
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // نادیده
  }
}

// ---------- ابزار داخلی ----------
async function authFetch(path: string, opts: RequestInit = {}, token = getToken()): Promise<Response> {
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  } catch {
    throw new Error(`به سرور (${API_BASE}) وصل نشد. روشن بودن go-api و تنظیم ADMIN_PANEL_ORIGINS را چک کن.`);
  }
  return res;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("توکن ادمین نامعتبر است.");
  }
  if (res.status === 503 && data.error === "admin_disabled") {
    throw new Error("ADMIN_TOKEN روی سرور تنظیم نشده؛ اول آن را در .env بک‌اند ست کن.");
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `خطای ناشناخته (${res.status})`);
  }
  return data as T;
}

// ---------- ورود ----------
// فقط با صدا زدن یک اندپوینت ادمین درستیِ توکن را می‌سنجد.
export async function verifyToken(token: string): Promise<void> {
  const res = await authFetch("/admin/settings", { method: "GET" }, token);
  if (res.status === 401) throw new Error("توکن اشتباه است.");
  await jsonOrThrow(res);
}

// ---------- تنظیمات هوش مصنوعی ----------
export async function getSettings(): Promise<SettingsResp> {
  return jsonOrThrow<SettingsResp>(await authFetch("/admin/settings", { method: "GET" }));
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await jsonOrThrow(
    await authFetch("/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    })
  );
}

// ---------- پراکسی Xray (vless) ----------
export async function getProxyStatus(): Promise<ProxyStatus> {
  return jsonOrThrow<ProxyStatus>(await authFetch("/admin/proxy/status", { method: "GET" }));
}

export async function connectProxy(link: string): Promise<ProxyStatus> {
  return jsonOrThrow<ProxyStatus>(
    await authFetch("/admin/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vless_link: link }),
    })
  );
}
