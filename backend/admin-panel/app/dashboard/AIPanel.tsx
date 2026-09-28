"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSetting } from "@/lib/api";
import type { AIProvider, SecretItem, SettingsResp } from "@/lib/types";

type Notify = (msg: string, type?: "ok" | "err") => void;

interface ProviderDef {
  id: AIProvider;
  title: string;
  subtitle: string;
  keyField: string;
  keyLabel: string;
  modelField: string;
  modelLabel: string;
  modelHint: string;
  secret: (s: SettingsResp) => SecretItem;
  model: (s: SettingsResp) => string;
  warning?: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "anthropic",
    title: "Claude (Anthropic)",
    subtitle: "مستقیم با API خودِ Anthropic",
    keyField: "ANTHROPIC_API_KEY",
    keyLabel: "کلید Anthropic",
    modelField: "CLAUDE_MODEL",
    modelLabel: "مدل Claude",
    modelHint: "مثلاً claude-sonnet-5 — خالی = پیش‌فرض (claude-opus-5)",
    secret: (s) => s.anthropic_api_key,
    model: (s) => s.claude_model,
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    subtitle: "یک کلید، همه‌ی مدل‌ها (Claude، Gemini، GPT، ...)",
    keyField: "OPENROUTER_API_KEY",
    keyLabel: "کلید OpenRouter",
    modelField: "OPENROUTER_MODEL",
    modelLabel: "مدل OpenRouter",
    modelHint: "شناسه‌ی مدل در OpenRouter، مثلاً google/gemini-2.5-flash — باید ورودی تصویر بپذیرد. خالی = anthropic/claude-sonnet-5",
    secret: (s) => s.openrouter_api_key,
    model: (s) => s.openrouter_model,
  },
  {
    id: "deepseek",
    title: "DeepSeek",
    subtitle: "API رسمی DeepSeek",
    keyField: "DEEPSEEK_API_KEY",
    keyLabel: "کلید DeepSeek",
    modelField: "DEEPSEEK_MODEL",
    modelLabel: "مدل DeepSeek",
    modelHint: "خالی = deepseek-chat",
    secret: (s) => s.deepseek_api_key,
    model: (s) => s.deepseek_model,
    warning:
      "Scan Problem عکس می‌فرستد. اگر مدل انتخاب‌شده‌ی DeepSeek ورودی تصویر نپذیرد، اسکن با خطا برمی‌گردد. در آن صورت از OpenRouter با یک مدل vision استفاده کن.",
  },
];

export default function AIPanel({ notify }: { notify: Notify }) {
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  async function load() {
    try {
      setSettings(await getSettings());
      setLoadError("");
    } catch (err: any) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(key: string, value: string, successMsg: string) {
    setSaving(key);
    try {
      await updateSetting(key, value);
      notify(successMsg, "ok");
      setInputs((s) => ({ ...s, [key]: "" }));
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setSaving(null);
    }
  }

  function saveKey(field: string) {
    const value = (inputs[field] ?? "").trim();
    if (!value) {
      notify("کلید را وارد کن", "err");
      return;
    }
    save(field, value, "کلید ذخیره شد و از همین الان فعال است");
  }

  function saveModel(field: string) {
    const value = (inputs[field] ?? "").trim();
    save(field, value, value ? "مدل ذخیره شد" : "مدل به پیش‌فرض برگشت");
  }

  if (loadError) {
    return (
      <div className="card">
        <div className="error-msg" style={{ marginTop: 0 }}>{loadError}</div>
        <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={load}>
          تلاش دوباره
        </button>
      </div>
    );
  }
  if (!settings) return <p className="hint">در حال بارگذاری تنظیمات...</p>;

  const active = PROVIDERS.find((p) => p.id === settings.ai_provider) ?? PROVIDERS[0];

  return (
    <div>
      <div className="card" style={{ borderColor: "var(--primary)" }}>
        <h2>
          ارائه‌دهنده‌ی فعال برای Scan Problem{" "}
          {settings.ai_ready ? (
            <span className="pill ok">آماده</span>
          ) : (
            <span className="pill err">کلید {active.title} ست نشده</span>
          )}
        </h2>
        <p className="card-desc">
          عکس مسئله با این مدل خوانده می‌شود. حل و بررسی جواب همیشه با SymPy است، نه هوش مصنوعی.
          تغییر همان لحظه اعمال می‌شود و نیازی به ری‌استارت نیست.
        </p>
        <div className="provider-grid">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`provider-option ${settings.ai_provider === p.id ? "active" : ""}`}
              disabled={saving === "AI_PROVIDER"}
              onClick={() => {
                if (settings.ai_provider !== p.id) save("AI_PROVIDER", p.id, `ارائه‌دهنده روی ${p.title} تنظیم شد`);
              }}
            >
              <strong>{p.title}</strong>
              <span>{p.subtitle}</span>
              <div style={{ marginTop: 6 }}>
                {p.secret(settings).set ? (
                  <span className="pill ok">کلید ست‌شده</span>
                ) : (
                  <span className="pill warn">بدون کلید</span>
                )}
              </div>
            </button>
          ))}
        </div>
        {active.warning && <div className="warn-box">{active.warning}</div>}
      </div>

      {PROVIDERS.map((p) => {
        const secret = p.secret(settings);
        const model = p.model(settings);
        return (
          <div className="card" key={p.id}>
            <h2>
              {p.title}{" "}
              {settings.ai_provider === p.id && <span className="pill ok">فعال</span>}
            </h2>
            <p className="card-desc">{p.subtitle}</p>

            <div className="field">
              <label htmlFor={p.keyField}>
                {p.keyLabel}{" "}
                {secret.set ? (
                  <span className="pill ok mono" dir="ltr">{secret.masked}</span>
                ) : (
                  <span className="pill err">ست نشده</span>
                )}
              </label>
              <div className="field-row">
                <input
                  id={p.keyField}
                  type="password"
                  dir="ltr"
                  autoComplete="off"
                  placeholder={secret.set ? "کلید جدید برای جایگزینی" : "کلید را اینجا بچسبان"}
                  value={inputs[p.keyField] ?? ""}
                  onChange={(e) => setInputs((s) => ({ ...s, [p.keyField]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveKey(p.keyField)}
                />
                <button className="btn btn-sm" onClick={() => saveKey(p.keyField)} disabled={saving === p.keyField}>
                  {saving === p.keyField ? "..." : "ذخیره"}
                </button>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor={p.modelField}>
                {p.modelLabel}{" "}
                <span className="hint">
                  فعلی: <code dir="ltr">{model || "پیش‌فرض"}</code>
                </span>
              </label>
              <div className="field-row">
                <input
                  id={p.modelField}
                  dir="ltr"
                  placeholder={p.modelHint}
                  value={inputs[p.modelField] ?? ""}
                  onChange={(e) => setInputs((s) => ({ ...s, [p.modelField]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveModel(p.modelField)}
                />
                <button className="btn btn-sm" onClick={() => saveModel(p.modelField)} disabled={saving === p.modelField}>
                  {saving === p.modelField ? "..." : "ذخیره"}
                </button>
              </div>
              <p className="hint" style={{ margin: "4px 0 0" }}>{p.modelHint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
