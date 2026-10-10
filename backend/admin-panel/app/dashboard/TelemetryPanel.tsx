"use client";

import { Fragment, useEffect, useState } from "react";
import { getTelemetryEvents, getTelemetrySummary, purgeTelemetry } from "@/lib/api";
import type { TelemetryErrorGroup, TelemetryEvent, TelemetrySummary } from "@/lib/types";

type Notify = (msg: string, type?: "ok" | "err") => void;

const KINDS: { value: string; label: string }[] = [
  { value: "", label: "همه" },
  { value: "crash", label: "کرش" },
  { value: "error", label: "خطا" },
  { value: "screen", label: "صفحه" },
  { value: "event", label: "رویداد" },
];

const KIND_PILL: Record<string, string> = { crash: "err", error: "warn", screen: "ok", event: "ok" };

function fa(n: number): string {
  return n.toLocaleString("fa-IR");
}

function when(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("fa-IR");
}

// گزارش خطا و آمار استفاده‌ی اپ (internal/service/telemetry روی سرور):
// کرش‌ها و خطاهای JS، بازدید صفحه‌ها و چند رویداد کلیدی. هیچ شماره‌تلفن یا
// توکنی ذخیره نمی‌شود و داده‌ها بعد از ۶۰ روز خودکار پاک می‌شوند.
export default function TelemetryPanel({ notify }: { notify: Notify }) {
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<TelemetryErrorGroup | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);
  const [purgeDays, setPurgeDays] = useState("30");
  const [purging, setPurging] = useState(false);

  async function loadSummary() {
    try {
      setSummary(await getTelemetrySummary());
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  async function loadEvents(k = kind, query = q) {
    try {
      setEvents(await getTelemetryEvents(k, query, 50));
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadSummary(), loadEvents()]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function purge() {
    const days = Number(purgeDays);
    if (!Number.isInteger(days) || days < 1) {
      notify("تعداد روز را به صورت عدد صحیح وارد کن", "err");
      return;
    }
    if (!window.confirm(`همه‌ی رویدادهای قدیمی‌تر از ${days} روز حذف شود؟`)) return;
    setPurging(true);
    try {
      const deleted = await purgeTelemetry(days);
      notify(`${fa(deleted)} رویداد حذف شد`, "ok");
      setSelected(null);
      await loadAll();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setPurging(false);
    }
  }

  if (loading && !summary) return <p className="hint">در حال بارگذاری گزارش...</p>;
  if (!summary) {
    return (
      <div className="card">
        <button className="btn btn-sm" onClick={loadAll}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  const maxDevices = Math.max(1, ...summary.daily_active.map((d) => d.devices));
  const maxViews = Math.max(1, ...summary.top_screens.map((s) => s.views));

  return (
    <div>
      <div className="card" style={{ borderColor: "var(--primary)" }}>
        <h2>🐞 خطاها و آمار</h2>
        <p className="card-desc">
          گزارش خودِ اپ (بدون سرویس خارجی). فقط داده‌ی فنی ذخیره می‌شود: متن خطا، نام صفحه‌ها، نسخه‌ی اپ و سیستم‌عامل،
          و چند رویداد کلیدی. شماره‌تلفن و توکن هرگز ذخیره نمی‌شود.
        </p>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="stat-label">کرش (۲۴ ساعت / ۷ روز)</div>
            <div className="stat-value">
              {fa(summary.last_24h.crash)} / {fa(summary.last_7d.crash)}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">خطا (۲۴ ساعت / ۷ روز)</div>
            <div className="stat-value">
              {fa(summary.last_24h.error)} / {fa(summary.last_7d.error)}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">بازدید صفحه (۲۴ ساعت / ۷ روز)</div>
            <div className="stat-value">
              {fa(summary.last_24h.screen)} / {fa(summary.last_7d.screen)}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">رویداد (۲۴ ساعت / ۷ روز)</div>
            <div className="stat-value">
              {fa(summary.last_24h.event)} / {fa(summary.last_7d.event)}
            </div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-sm btn-ghost" onClick={loadAll} disabled={loading}>
            {loading ? "..." : "بروزرسانی"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>پرتکرارترین خطاها (۷ روز اخیر)</h2>
        {summary.top_errors.length === 0 ? (
          <p className="hint">خطایی ثبت نشده 🎉</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>نوع</th>
                  <th>خطا</th>
                  <th>تعداد</th>
                  <th>آخرین بار</th>
                  <th>نسخه‌ها</th>
                </tr>
              </thead>
              <tbody>
                {summary.top_errors.map((g) => (
                  <tr
                    key={`${g.name}|${g.message}`}
                    onClick={() => setSelected(selected?.latest_id === g.latest_id ? null : g)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className={`pill ${KIND_PILL[g.kind]}`}>{g.kind === "crash" ? "کرش" : "خطا"}</span>
                    </td>
                    <td className="ltr">
                      <strong>{g.name || "—"}</strong>
                      <div className="hint">{g.message.slice(0, 140)}</div>
                    </td>
                    <td>{fa(g.count)}</td>
                    <td>{when(g.last_seen)}</td>
                    <td className="ltr">{g.app_versions.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selected && (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 6px" }}>آخرین stack این خطا</h3>
            <pre
              dir="ltr"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, maxHeight: 320, overflow: "auto" }}
            >
              {selected.message}
              {"\n\n"}
              {selected.latest_stack || "(stack ندارد)"}
            </pre>
          </div>
        )}
      </div>

      <div className="card">
        <h2>کاربران فعال روزانه (۱۴ روز اخیر)</h2>
        <p className="hint">تعداد دستگاه‌های متمایز که آن روز چیزی گزارش کرده‌اند.</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }} dir="ltr">
          {summary.daily_active.map((d) => (
            <div key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 11 }} title={`${d.date}: ${d.devices}`}>
              <div>{fa(d.devices)}</div>
              <div
                style={{
                  height: `${Math.max(2, (d.devices / maxDevices) * 90)}px`,
                  background: "var(--primary)",
                  borderRadius: 3,
                  marginTop: 2,
                }}
              />
              <div className="hint">{d.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>پربازدیدترین صفحه‌ها (۷ روز اخیر)</h2>
        {summary.top_screens.length === 0 ? (
          <p className="hint">هنوز بازدیدی ثبت نشده.</p>
        ) : (
          summary.top_screens.map((s) => (
            <div key={s.screen} className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="ltr" style={{ width: 160, flexShrink: 0 }} dir="ltr">
                {s.screen}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: `${(s.views / maxViews) * 100}%`,
                    height: 10,
                    background: "var(--primary)",
                    borderRadius: 3,
                  }}
                />
              </div>
              <span>{fa(s.views)}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>آخرین رویدادها</h2>
        <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              loadEvents(e.target.value, q);
            }}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <input
            dir="ltr"
            placeholder="جستجو در نام / پیام / صفحه"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadEvents()}
          />
          <button className="btn btn-sm" onClick={() => loadEvents()}>
            جستجو
          </button>
        </div>
        {events.length === 0 ? (
          <p className="hint">رویدادی پیدا نشد.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>نوع</th>
                  <th>نام / پیام</th>
                  <th>صفحه</th>
                  <th>نسخه</th>
                  <th>دستگاه</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <Fragment key={e.id}>
                    <tr
                      onClick={() => setOpenEvent(openEvent === e.id ? null : e.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{when(e.created_at)}</td>
                      <td>
                        <span className={`pill ${KIND_PILL[e.kind]}`}>{e.kind}</span>
                      </td>
                      <td className="ltr">
                        {e.name}
                        {e.message && <div className="hint">{e.message.slice(0, 100)}</div>}
                      </td>
                      <td className="ltr">{e.screen || "—"}</td>
                      <td className="ltr">
                        {e.app_version || "—"} ({e.platform}
                        {e.os_version ? ` ${e.os_version}` : ""})
                      </td>
                      <td className="ltr hint">{e.device_id ? e.device_id.slice(0, 8) : "—"}</td>
                    </tr>
                    {openEvent === e.id && (
                      <tr>
                        <td colSpan={6}>
                          <pre dir="ltr" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, margin: 0 }}>
                            {e.stack ? `${e.stack}\n\n` : ""}
                            {Object.keys(e.extra || {}).length > 0 ? JSON.stringify(e.extra, null, 2) : ""}
                            {!e.stack && Object.keys(e.extra || {}).length === 0 ? "(جزئیات بیشتری ندارد)" : ""}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>پاک‌سازی</h2>
        <p className="hint">
          رویدادهای قدیمی‌تر از ۶۰ روز خودکار پاک می‌شوند؛ اینجا می‌توانی زودتر پاک کنی.
        </p>
        <div className="field-row">
          <input
            dir="ltr"
            inputMode="numeric"
            style={{ maxWidth: 100 }}
            value={purgeDays}
            onChange={(e) => setPurgeDays(e.target.value)}
          />
          <span>روز</span>
          <button className="btn btn-sm btn-danger" onClick={purge} disabled={purging}>
            {purging ? "..." : "حذف قدیمی‌ترها"}
          </button>
        </div>
      </div>
    </div>
  );
}
