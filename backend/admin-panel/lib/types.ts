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
