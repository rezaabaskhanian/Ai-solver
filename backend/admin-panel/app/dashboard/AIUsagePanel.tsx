"use client";

import { useEffect, useState } from "react";
import { getAIUsageReport, getSettings, updateSetting } from "@/lib/api";
import type { AIUsageReport, AIUsageTotals } from "@/lib/types";

type Notify = (msg: string, type?: "ok" | "err") => void;

const PERIODS = [7, 30, 90];

const PRICING_PLACEHOLDER = `{"anthropic":{"input_per_1m":5,"output_per_1m":25},"deepseek":{"input_per_1m":0.27,"output_per_1m":1.1}}`;

function usd(v: number, digits = 4): string {
  return `$${v.toFixed(digits)}`;
}

function toman(v: number, rate: number): string {
  return `${Math.round(v * rate).toLocaleString("fa-IR")} تومان`;
}

function perCall(t: AIUsageTotals): number {
  return t.calls > 0 ? t.cost_usd / t.calls : 0;
}

// The real cost of AI (internal/service/aiusage on the server), like
// LingoFlow's «هزینه‌ی واقعی AI» card but per call: every photo scan is
// recorded with its tokens and cost — OpenRouter's own reported charge,
// or an estimate from AI_TOKEN_PRICING for the other providers.
export default function AIUsagePanel({ notify }: { notify: Notify }) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AIUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateInput, setRateInput] = useState("");
  const [pricing, setPricing] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load(d = days) {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([getAIUsageReport(d), getSettings()]);
      setReport(r);
      setPricing(s.ai_token_pricing || "");
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function save(key: string, value: string, msg: string) {
    setSaving(key);
    try {
      await updateSetting(key, value);
      notify(msg, "ok");
      if (key === "USD_TOMAN_RATE") setRateInput("");
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setSaving(null);
    }
  }

  function saveRate() {
    const raw = rateInput.trim().replace(/,/g, "");
    if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
      notify("نرخ دلار را به تومان و به صورت عدد وارد کن", "err");
      return;
    }
    save("USD_TOMAN_RATE", raw, `نرخ دلار ${Number(raw).toLocaleString("fa-IR")} تومان شد`);
  }

  function savePricing() {
    const raw = pricing.trim();
    if (raw) {
      try {
        JSON.parse(raw);
      } catch {
        notify("JSON نامعتبر است", "err");
        return;
      }
    }
    save("AI_TOKEN_PRICING", raw, "قیمت‌ها ذخیره شد");
  }

  if (loading && !report) return <p className="hint">در حال بارگذاری گزارش...</p>;
  if (!report) {
    return (
      <div className="card">
        <button className="btn btn-sm" onClick={() => load()}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  const rate = report.usd_toman_rate;
  const period = report.period;
  const avg = perCall(period);

  return (
    <div>
      <div className="card" style={{ borderColor: "var(--primary)" }}>
        <h2>💰 هزینه‌ی هوش مصنوعی</h2>
        <p className="card-desc">
          فقط اسکن عکس هوش مصنوعی مصرف می‌کند؛ حل مسئله با موتور ریاضی خود سرور است و هزینه ندارد. هزینه‌ی هر
          اسکن از خود OpenRouter گرفته می‌شود (دقیق)؛ برای Anthropic/DeepSeek از قیمت‌های پایین همین صفحه تخمین زده
          می‌شود.
        </p>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          {PERIODS.map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${d === days ? "" : "btn-ghost"}`}
              onClick={() => setDays(d)}
              disabled={loading}
            >
              {d} روز اخیر
            </button>
          ))}
        </div>

        <div className="stat-grid">
          <div className="stat-box">
            <div className="stat-label">هزینه‌ی {report.period_days} روز اخیر</div>
            <div className="stat-value">{toman(period.cost_usd, rate)}</div>
            <div className="stat-sub" dir="ltr">{usd(period.cost_usd, 2)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">میانگین هزینه‌ی هر اسکن</div>
            <div className="stat-value">{toman(avg, rate)}</div>
            <div className="stat-sub" dir="ltr">{usd(avg, 5)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">تعداد اسکن ({report.period_days} روز)</div>
            <div className="stat-value">{period.calls.toLocaleString("fa-IR")}</div>
            <div className="stat-sub">
              میانگین توکن: {period.calls ? Math.round(period.input_tokens / period.calls).toLocaleString("fa-IR") : 0} ورودی /{" "}
              {period.calls ? Math.round(period.output_tokens / period.calls).toLocaleString("fa-IR") : 0} خروجی
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">هزینه‌ی کل (همه‌ی زمان)</div>
            <div className="stat-value">{toman(report.all_time.cost_usd, rate)}</div>
            <div className="stat-sub" dir="ltr">
              {usd(report.all_time.cost_usd, 2)} · {report.all_time.calls} scans
            </div>
          </div>
        </div>
      </div>

      {report.models.length > 0 && (
        <div className="card">
          <h2>به تفکیک مدل ({report.period_days} روز اخیر)</h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>مدل</th>
                  <th>تعداد اسکن</th>
                  <th>هزینه‌ی کل</th>
                  <th>هر اسکن</th>
                </tr>
              </thead>
              <tbody>
                {report.models.map((m) => (
                  <tr key={`${m.provider}/${m.model}`}>
                    <td className="ltr">
                      {m.provider} / {m.model || "—"}
                    </td>
                    <td>{m.calls.toLocaleString("fa-IR")}</td>
                    <td>{toman(m.cost_usd, rate)}</td>
                    <td>{toman(perCall(m), rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2>روزانه</h2>
        {report.daily.length === 0 ? (
          <p className="hint">هنوز اسکنی در این بازه ثبت نشده.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>اسکن</th>
                  <th>توکن ورودی / خروجی</th>
                  <th>هزینه</th>
                </tr>
              </thead>
              <tbody>
                {report.daily.map((d) => (
                  <tr key={d.date}>
                    <td className="ltr">{d.date}</td>
                    <td>{d.calls.toLocaleString("fa-IR")}</td>
                    <td className="ltr">
                      {d.input_tokens.toLocaleString()} / {d.output_tokens.toLocaleString()}
                    </td>
                    <td>
                      {toman(d.cost_usd, rate)} <span className="hint">({usd(d.cost_usd, 3)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>آخرین اسکن‌ها (هزینه‌ی هر درخواست)</h2>
        {report.recent.length === 0 ? (
          <p className="hint">هنوز اسکنی ثبت نشده.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>مدل</th>
                  <th>توکن ورودی / خروجی</th>
                  <th>هزینه</th>
                  <th>کاربر</th>
                </tr>
              </thead>
              <tbody>
                {report.recent.map((c, i) => (
                  <tr key={`${c.created_at}-${i}`}>
                    <td className="ltr">{c.created_at}</td>
                    <td className="ltr">{c.model || c.provider}</td>
                    <td className="ltr">
                      {c.input_tokens.toLocaleString()} / {c.output_tokens.toLocaleString()}
                    </td>
                    <td>
                      {toman(c.cost_usd, rate)}{" "}
                      <span className={`pill ${c.cost_estimated ? "warn" : "ok"}`}>
                        {c.cost_estimated ? "تخمینی" : "دقیق"}
                      </span>
                    </td>
                    <td className="ltr hint">{c.user_id ? c.user_id.slice(0, 8) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>تنظیمات محاسبه</h2>
        <div className="field">
          <label htmlFor="usd-rate">
            نرخ دلار (تومان) <span className="pill ok">فعلی: {rate.toLocaleString("fa-IR")}</span>
          </label>
          <div className="field-row">
            <input
              id="usd-rate"
              dir="ltr"
              inputMode="numeric"
              placeholder={String(rate)}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveRate()}
            />
            <button className="btn btn-sm" onClick={saveRate} disabled={saving === "USD_TOMAN_RATE"}>
              {saving === "USD_TOMAN_RATE" ? "..." : "ذخیره"}
            </button>
          </div>
          <p className="hint" style={{ margin: "4px 0 0" }}>فقط برای نمایش هزینه‌ها به تومان.</p>
        </div>

        <div className="field">
          <label htmlFor="pricing">قیمت هر provider (دلار به ازای هر ۱ میلیون توکن)</label>
          <textarea
            id="pricing"
            dir="ltr"
            rows={3}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
            placeholder={PRICING_PLACEHOLDER}
            value={pricing}
            onChange={(e) => setPricing(e.target.value)}
          />
          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn btn-sm" onClick={savePricing} disabled={saving === "AI_TOKEN_PRICING"}>
              {saving === "AI_TOKEN_PRICING" ? "..." : "ذخیره‌ی قیمت‌ها"}
            </button>
          </div>
          <p className="hint" style={{ margin: "4px 0 0" }}>
            فقط برای Anthropic و DeepSeek لازم است (OpenRouter هزینه‌ی واقعی را خودش می‌گوید). قیمت مدل فعالت را از
            سایت همان provider بردار. خالی = قیمت‌های پیش‌فرض تقریبی. تغییر قیمت فقط روی اسکن‌های بعدی اثر دارد.
          </p>
        </div>
      </div>
    </div>
  );
}
