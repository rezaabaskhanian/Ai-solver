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
