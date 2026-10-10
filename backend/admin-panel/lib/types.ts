export type AIProvider = "anthropic" | "openrouter" | "deepseek";

export interface SecretItem {
  set: boolean;
  masked: string;
}

export interface SettingsResp {
  ai_provider: AIProvider;
  ai_ready: boolean;
  anthropic_api_key: SecretItem;
  claude_model: string;
  openrouter_api_key: SecretItem;
  openrouter_model: string;
  deepseek_api_key: SecretItem;
  deepseek_model: string;
  quota: QuotaConfig;
  bazaar_api_secret: SecretItem;
  sms_ir_api_key: SecretItem;
  sms_ir_otp_template_id: string;
  ai_token_pricing: string;
  usd_toman_rate: string;
}

// ---------- هزینه‌ی هوش مصنوعی (GET /admin/ai-usage) ----------
export interface AIUsageTotals {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface AIUsageDay extends AIUsageTotals {
  date: string;
}

export interface AIUsageModel extends AIUsageTotals {
  provider: string;
  model: string;
}

export interface AIUsageCall {
  created_at: string;
  user_id: string;
  feature: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  // false: the provider reported the exact charge (OpenRouter).
  cost_estimated: boolean;
}

export interface AIUsageReport {
  period_days: number;
  usd_toman_rate: number;
  all_time: AIUsageTotals;
  period: AIUsageTotals;
  daily: AIUsageDay[];
  models: AIUsageModel[];
  recent: AIUsageCall[];
}

// A Cafe Bazaar in-app product that adds duration_days of Premium
// (internal/service/billing on the server).
export interface Plan {
  id: string;
  name: string;
  duration_days: number;
  price_toman: number;
  product_id: string;
  purchase_count: number;
}

export interface AppUser {
  id: string;
  code: string;
  // Set once the user signed up in the app.
  phone?: string;
  nickname?: string;
  premium_lifetime: boolean;
  premium_until?: string;
  is_unlimited: boolean;
  solve_count: number;
  purchase_count: number;
  created_at: string;
  last_seen_at: string;
}

export type GrantAction =
  | { action: "add_days"; days: number }
  | { action: "unlimited"; unlimited: boolean }
  | { action: "revoke" };

export type QuotaPeriod = "daily" | "lifetime";

// Usage limits in effect on the server (internal/service/quota).
export interface QuotaConfig {
  free_quota_period: QuotaPeriod;
  free_daily_limit: number;
  free_lifetime_limit: number;
  premium_daily_scan_limit: number;
}

export interface ProxyStatus {
  connected: boolean;
  ip?: string;
  country?: string;
  org?: string;
  error?: string;
  via_proxy: boolean;
  link?: string;
}

// ---------- صفحه‌ی معرفی (landing, mathmotion.ir) ----------
export interface LandingImage {
  id: string;
  url: string;
}

export interface LandingSection {
  id: string;
  tab_label: string;
  title: string;
  description: string;
  position: number;
  images: LandingImage[];
}

export interface LandingSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  google_play_url: string;
  bazaar_url: string;
  cta_title: string;
  cta_subtitle: string;
}

export type LandingHighlightKind = "feature" | "step";

export interface LandingHighlight {
  id: string;
  icon: string;
  title: string;
  description: string;
  position: number;
}

export interface LandingFAQ {
  id: string;
  question: string;
  answer: string;
  position: number;
}

// ---------- نکات کنکوری (آینه‌ی mobile/.../content/konkur/types.ts) ----------
export type KonkurLine = string | { math: string };
export type KonkurGrade = 7 | 8 | 9 | 10 | 11 | 12;
export type KonkurTrack = "riazi" | "tajrobi";

export interface KonkurTip {
  id: string;
  // null = نکته‌ی عمومی (برای همه‌ی پایه‌ها)
  grade: KonkurGrade | null;
  chapterId?: string;
  // رشته‌هایی که این نکته را می‌بینند؛ خالی/نبودن = همه‌ی رشته‌ها
  tracks?: ("riazi" | "tajrobi")[];
  title: string;
  body: KonkurLine[];
  // توضیح کامل (اختیاری)
  details?: KonkurLine[];
  example?: {
    question: KonkurLine[];
    solution: KonkurLine[];
  };
}

export type KonkurSource =
  | { kind: "authored" }
  | {
      kind: "konkur";
      year: number;
      track: KonkurTrack;
      number?: number;
      abroad?: boolean;
      newSystem?: boolean;
      round?: 1 | 2;
    };

// «مسیر حل»: فهم سؤال (داده‌ها/خواسته)، راهنمایی‌های پله‌ای و دام تست — همه اختیاری
export interface KonkurGuide {
  given?: KonkurLine[];
  asked?: KonkurLine[];
  hints?: KonkurLine[][];
  trap?: KonkurLine[];
}

export interface KonkurQuestion {
  id: string;
  tipIds: string[];
  text: string;
  expression?: string;
  // مسیر/آدرس عکسِ آپلودشده (POST /admin/upload)
  figureUrl?: string;
  choices: [string, string, string, string];
  choicesMath?: boolean;
  answer: 0 | 1 | 2 | 3;
  solution: KonkurLine[];
  guide?: KonkurGuide;
  source: KonkurSource;
}

export interface KonkurQuestionFilters {
  year?: string;
  track?: string;
  tipId?: string;
  q?: string;
}

export type KonkurDraftStatus = "pending" | "approved" | "rejected";

// data می‌تواند ناقص باشد (خروجی هوش مصنوعی)
export interface KonkurDraft {
  id: string;
  kind: "question" | "tip";
  source_name: string;
  status: KonkurDraftStatus;
  data: Record<string, unknown>;
  warnings: string[];
  created_at: string;
}

export interface KonkurExtractResult {
  drafts: KonkurDraft[];
  skipped?: unknown[];
}

export interface KonkurExtractMeta {
  source_name: string;
  kind: "questions" | "tips";
  year?: string;
  track?: string;
  round?: string;
  abroad?: boolean;
  page_label?: string;
}

// ---------- محتوای آماده‌ی اپ (seed داخل ایمیج API) ----------
export interface KonkurSeedStatus {
  tips: number;
  questions: number;
  missing_tips: number;
  missing_questions: number;
  figures: number;
}

export interface KonkurSeedResult {
  added_tips: number;
  added_questions: number;
  skipped_tips: number;
  skipped_questions: number;
  invalid_tips: number;
  invalid_questions: number;
  problems: string[];
  figures_copied: number;
  version: number;
}

// ---------- خطاها و آمار (GET /admin/telemetry/*) ----------
export interface TelemetryKindCounts {
  crash: number;
  error: number;
  screen: number;
  event: number;
}

export interface TelemetryErrorGroup {
  kind: "crash" | "error";
  name: string;
  message: string;
  count: number;
  last_seen: string;
  app_versions: string[];
  latest_stack: string;
  latest_id: number;
}

export interface TelemetrySummary {
  last_24h: TelemetryKindCounts;
  last_7d: TelemetryKindCounts;
  top_errors: TelemetryErrorGroup[];
  top_screens: { screen: string; views: number }[];
  daily_active: { date: string; devices: number }[];
}

export type TelemetryKind = "crash" | "error" | "screen" | "event";

export interface TelemetryEvent {
  id: number;
  created_at: string;
  user_id: string;
  device_id: string;
  kind: TelemetryKind;
  name: string;
  message: string;
  stack: string;
  screen: string;
  app_version: string;
  platform: string;
  os_version: string;
  extra: Record<string, unknown>;
}
