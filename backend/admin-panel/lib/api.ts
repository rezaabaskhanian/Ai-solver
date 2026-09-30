import type {
  AIUsageReport,
  AppUser,
  GrantAction,
  LandingFAQ,
  LandingHighlight,
  LandingHighlightKind,
  LandingSection,
  LandingSettings,
  Plan,
  ProxyStatus,
  SettingsResp,
} from "./types";

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

// ---------- هزینه‌ی هوش مصنوعی ----------
export async function getAIUsageReport(days = 30): Promise<AIUsageReport> {
  return jsonOrThrow<AIUsageReport>(await authFetch(`/admin/ai-usage?days=${days}`, { method: "GET" }));
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

// ---------- اشتراک‌ها ----------
export async function getPlans(): Promise<Plan[]> {
  return (await jsonOrThrow<{ plans: Plan[] }>(await authFetch("/admin/plans", { method: "GET" }))).plans;
}

export async function savePlan(plan: Omit<Plan, "id" | "purchase_count">): Promise<Plan> {
  return jsonOrThrow<Plan>(
    await authFetch("/admin/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    })
  );
}

export async function deletePlan(id: string): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/plans/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export async function searchUsers(q: string): Promise<AppUser[]> {
  const path = `/admin/users?q=${encodeURIComponent(q)}`;
  return (await jsonOrThrow<{ users: AppUser[] }>(await authFetch(path, { method: "GET" }))).users;
}

export async function grantPremium(userId: string, action: GrantAction): Promise<void> {
  await jsonOrThrow(
    await authFetch(`/admin/users/${encodeURIComponent(userId)}/premium`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    })
  );
}

// ---------- صفحه‌ی معرفی (landing, mathmotion.ir) — مثل پنل لینگوفلو ----------
function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// آپلود یک عکس (اسکرین‌شات اپ و ...)؛ مسیر عمومی آن را برمی‌گرداند، مثل /uploads/x.png
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const data = await jsonOrThrow<{ url: string }>(await authFetch("/admin/upload", { method: "POST", body: fd }));
  return data.url;
}

export async function getLandingSettings(): Promise<LandingSettings> {
  return jsonOrThrow<LandingSettings>(await authFetch("/admin/landing-settings", { method: "GET" }));
}

export async function updateLandingSettings(s: LandingSettings): Promise<void> {
  await jsonOrThrow(await authFetch("/admin/landing-settings", jsonBody("PUT", s)));
}

export async function listLandingHighlights(kind: LandingHighlightKind): Promise<LandingHighlight[]> {
  const data = await jsonOrThrow<{ highlights: LandingHighlight[] }>(
    await authFetch(`/admin/landing-highlights/${kind}`, { method: "GET" })
  );
  return data.highlights || [];
}

export async function createLandingHighlight(
  kind: LandingHighlightKind,
  icon: string,
  title: string,
  description: string,
  position: number
): Promise<LandingHighlight> {
  return jsonOrThrow<LandingHighlight>(
    await authFetch(`/admin/landing-highlights/${kind}`, jsonBody("POST", { icon, title, description, position }))
  );
}

export async function updateLandingHighlight(
  kind: LandingHighlightKind,
  id: string,
  icon: string,
  title: string,
  description: string,
  position: number
): Promise<void> {
  await jsonOrThrow(
    await authFetch(`/admin/landing-highlights/${kind}/${id}`, jsonBody("PUT", { icon, title, description, position }))
  );
}

export async function deleteLandingHighlight(kind: LandingHighlightKind, id: string): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/landing-highlights/${kind}/${id}`, { method: "DELETE" }));
}

export async function listLandingSections(): Promise<LandingSection[]> {
  const data = await jsonOrThrow<{ sections: LandingSection[] }>(
    await authFetch("/admin/landing-sections", { method: "GET" })
  );
  return data.sections || [];
}

export async function createLandingSection(
  tabLabel: string,
  title: string,
  description: string,
  position: number
): Promise<LandingSection> {
  return jsonOrThrow<LandingSection>(
    await authFetch("/admin/landing-sections", jsonBody("POST", { tab_label: tabLabel, title, description, position }))
  );
}

export async function updateLandingSection(
  id: string,
  tabLabel: string,
  title: string,
  description: string,
  position: number
): Promise<void> {
  await jsonOrThrow(
    await authFetch(`/admin/landing-sections/${id}`, jsonBody("PUT", { tab_label: tabLabel, title, description, position }))
  );
}

export async function deleteLandingSection(id: string): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/landing-sections/${id}`, { method: "DELETE" }));
}

export async function addLandingSectionImage(sectionId: string, url: string, position = 0): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/landing-sections/${sectionId}/images`, jsonBody("POST", { url, position })));
}

export async function deleteLandingSectionImage(sectionId: string, imageId: string): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/landing-sections/${sectionId}/images/${imageId}`, { method: "DELETE" }));
}

export async function listLandingFAQs(): Promise<LandingFAQ[]> {
  const data = await jsonOrThrow<{ faqs: LandingFAQ[] }>(await authFetch("/admin/landing-faqs", { method: "GET" }));
  return data.faqs || [];
}

export async function createLandingFAQ(question: string, answer: string, position: number): Promise<LandingFAQ> {
  return jsonOrThrow<LandingFAQ>(await authFetch("/admin/landing-faqs", jsonBody("POST", { question, answer, position })));
}

export async function updateLandingFAQ(id: string, question: string, answer: string, position: number): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/landing-faqs/${id}`, jsonBody("PUT", { question, answer, position })));
}

export async function deleteLandingFAQ(id: string): Promise<void> {
  await jsonOrThrow(await authFetch(`/admin/landing-faqs/${id}`, { method: "DELETE" }));
}
