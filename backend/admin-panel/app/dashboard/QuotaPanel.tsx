"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSetting } from "@/lib/api";
import type { QuotaConfig, QuotaPeriod } from "@/lib/types";

type Notify = (msg: string, type?: "ok" | "err") => void;

interface LimitField {
  key: string;
  label: string;
  hint: string;
  value: (q: QuotaConfig) => number;
  // Only relevant in this period (undefined = always shown).
  period?: QuotaPeriod;
}

const LIMITS: LimitField[] = [
  {
    key: "FREE_DAILY_LIMIT",
    label: "سهمیه‌ی رایگان روزانه",
    hint: "تعداد کل حل + اسکن + بررسی راه‌حل در هر روز برای کاربر رایگان. روز ساعت ۰۰:۰۰ به وقت تهران ریست می‌شود.",
    value: (q) => q.free_daily_limit,
    period: "daily",
  },
  {
    key: "FREE_LIFETIME_LIMIT",
    label: "سهمیه‌ی رایگان کل (یک‌باره)",
    hint: "تعداد کل حل + اسکن + بررسی راه‌حل برای همیشه، برای هر دستگاه.",
    value: (q) => q.free_lifetime_limit,
    period: "lifetime",
  },
  {
    key: "PREMIUM_DAILY_SCAN_LIMIT",
    label: "سقف اسکن روزانه‌ی پرمیوم",
    hint: "فقط اسکن (که هزینه‌ی هوش مصنوعی دارد) محدود می‌شود؛ حل تایپی پرمیوم نامحدود است. ۰ = بدون سقف.",
    value: (q) => q.premium_daily_scan_limit,
  },
];

// Usage limits (internal/service/quota on the server). Every change applies
// to the very next request — no restart, no app update.
export default function QuotaPanel({ notify }: { notify: Notify }) {
  const [quota, setQuota] = useState<QuotaConfig | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  async function load() {
    try {
      setQuota((await getSettings()).quota);
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

  function saveLimit(field: LimitField) {
    const raw = (inputs[field.key] ?? "").trim();
    if (!/^\d+$/.test(raw)) {
      notify("یک عدد صحیح (۰ یا بیشتر) وارد کن", "err");
      return;
    }
    save(field.key, raw, `${field.label} روی ${raw} تنظیم شد`);
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
  if (!quota) return <p className="hint">در حال بارگذاری تنظیمات...</p>;

  const periods: { id: QuotaPeriod; title: string; subtitle: string }[] = [
    { id: "daily", title: "روزانه", subtitle: "هر روز دوباره پر می‌شود — انگیزه‌ی برگشت روزانه، و حذف/نصب دوباره‌ی اپ فایده‌ای ندارد." },
    { id: "lifetime", title: "یک‌باره", subtitle: "فقط چند استفاده‌ی اول رایگان است (مدل قبلی)." },
  ];

  return (
    <div>
      <div className="card" style={{ borderColor: "var(--primary)" }}>
        <h2>نوع سهمیه‌ی رایگان</h2>
        <p className="card-desc">
          برای کاربر رایگان، حل تایپی، اسکن عکس و «بررسی حل خودم» همه از یک سهمیه کم می‌کنند.
          تغییرات همان لحظه روی درخواست بعدی اعمال می‌شوند.
        </p>
        <div className="provider-grid">
          {periods.map((p) => (
            <button
              key={p.id}
              className={`provider-option ${quota.free_quota_period === p.id ? "active" : ""}`}
              disabled={saving === "FREE_QUOTA_PERIOD"}
              onClick={() => {
                if (quota.free_quota_period !== p.id) save("FREE_QUOTA_PERIOD", p.id, `سهمیه‌ی رایگان ${p.title} شد`);
              }}
            >
              <strong>{p.title}</strong>
              <span>{p.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>محدودیت‌ها</h2>
        {LIMITS.map((field) => {
          const inactive = field.period && field.period !== quota.free_quota_period;
          return (
            <div className="field" key={field.key} style={inactive ? { opacity: 0.55 } : undefined}>
              <label htmlFor={field.key}>
                {field.label}{" "}
                <span className="pill ok">فعلی: {field.value(quota)}</span>
                {inactive && <span className="pill warn">در حالت فعلی استفاده نمی‌شود</span>}
              </label>
              <div className="field-row">
                <input
                  id={field.key}
                  dir="ltr"
                  inputMode="numeric"
                  placeholder={String(field.value(quota))}
                  value={inputs[field.key] ?? ""}
                  onChange={(e) => setInputs((s) => ({ ...s, [field.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveLimit(field)}
                />
                <button className="btn btn-sm" onClick={() => saveLimit(field)} disabled={saving === field.key}>
                  {saving === field.key ? "..." : "ذخیره"}
                </button>
              </div>
              <p className="hint" style={{ margin: "4px 0 0" }}>{field.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
