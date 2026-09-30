"use client";

import { useEffect, useState } from "react";
import {
  deletePlan,
  getPlans,
  getSettings,
  grantPremium,
  savePlan,
  searchUsers,
  updateSetting,
} from "@/lib/api";
import type { AppUser, GrantAction, Plan, SecretItem, SettingsResp } from "@/lib/types";

type Notify = (msg: string, type?: "ok" | "err") => void;

const faDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fa-IR") : "");
const faNum = (n: number) => n.toLocaleString("fa-IR");

// Subscriptions (internal/service/billing on the server): the Cafe Bazaar
// token purchases are verified with, the plans for sale, and per-user
// grants. There's no login, so a user is found by the code the app shows
// in its Settings screen.
export default function SubscriptionPanel({ notify }: { notify: Notify }) {
  return (
    <div>
      <UsersCard notify={notify} />
      <PlansCard notify={notify} />
      <BazaarTokenCard notify={notify} />
      <SmsCard notify={notify} />
    </div>
  );
}

// ---------- کاربران ----------

function premiumLabel(u: AppUser): { text: string; tone: "ok" | "warn" | "err" } {
  if (u.is_unlimited) return { text: "نامحدود", tone: "ok" };
  if (u.premium_until && new Date(u.premium_until) > new Date()) {
    return { text: `پرمیوم تا ${faDate(u.premium_until)}`, tone: "ok" };
  }
  if (u.premium_lifetime) return { text: "پرمیوم دائمی (خرید قدیمی)", tone: "ok" };
  return { text: "رایگان", tone: "warn" };
}

function UsersCard({ notify }: { notify: Notify }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [days, setDays] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function search(q = query) {
    try {
      setUsers(await searchUsers(q));
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  useEffect(() => {
    search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apply(u: AppUser, action: GrantAction, successMsg: string) {
    if (action.action === "revoke" && !confirm(`اشتراک کاربر ${u.code} به‌طور کامل لغو شود؟`)) return;
    setBusy(u.id);
    try {
      await grantPremium(u.id, action);
      notify(successMsg, "ok");
      await search();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setBusy(null);
    }
  }

  function addDays(u: AppUser) {
    const raw = (days[u.id] ?? "").trim();
    if (!/^\d+$/.test(raw) || Number(raw) < 1) {
      notify("تعداد روز را به‌صورت عدد وارد کن", "err");
      return;
    }
    apply(u, { action: "add_days", days: Number(raw) }, `${raw} روز پرمیوم به ${u.code} اضافه شد`);
    setDays((s) => ({ ...s, [u.id]: "" }));
  }

  return (
    <div className="card" style={{ borderColor: "var(--primary)" }}>
      <h2>کاربران</h2>
      <p className="card-desc">
        کاربر را با شماره موبایلش (اگر ثبت‌نام کرده) یا «کد کاربری» صفحه‌ی تنظیمات اپ پیدا کن و روز پرمیوم اضافه کن،
        نامحدودش کن یا اشتراکش را لغو کن. «نامحدود» یعنی هیچ سقفی — حتی سقف اسکن روزانه‌ی پرمیوم.
        بدون جست‌وجو، آخرین کاربرهای فعال نشان داده می‌شوند.
      </p>
      <div className="field-row">
        <input
          dir="ltr"
          placeholder="شماره موبایل یا کد کاربری، مثلاً 0912… یا K7M2QX9A"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="btn btn-sm" onClick={() => search()}>
          جست‌وجو
        </button>
      </div>

      {users === null ? (
        <p className="hint">در حال بارگذاری...</p>
      ) : users.length === 0 ? (
        <p className="empty">کاربری پیدا نشد.</p>
      ) : (
        users.map((u) => {
          const label = premiumLabel(u);
          return (
            <div className="field" key={u.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <label>
                <span className="mono" dir="ltr">
                  {u.code}
                </span>{" "}
                {u.phone ? (
                  <>
                    <span className="mono" dir="ltr">
                      {u.phone}
                    </span>{" "}
                    {u.nickname && <span>({u.nickname})</span>}{" "}
                  </>
                ) : (
                  <span className="pill warn">ثبت‌نام نکرده</span>
                )}{" "}
                <span className={`pill ${label.tone}`}>{label.text}</span>{" "}
                <span className="hint">
                  {faNum(u.solve_count)} حل · {faNum(u.purchase_count)} خرید · آخرین استفاده {faDate(u.last_seen_at)}
                </span>
              </label>
              <div className="field-row">
                <input
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="تعداد روز، مثلاً 30"
                  value={days[u.id] ?? ""}
                  onChange={(e) => setDays((s) => ({ ...s, [u.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addDays(u)}
                />
                <button className="btn btn-sm" disabled={busy === u.id} onClick={() => addDays(u)}>
                  افزودن روز
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={busy === u.id}
                  onClick={() =>
                    apply(
                      u,
                      { action: "unlimited", unlimited: !u.is_unlimited },
                      u.is_unlimited ? `نامحدود ${u.code} برداشته شد` : `${u.code} نامحدود شد`
                    )
                  }
                >
                  {u.is_unlimited ? "برداشتن نامحدود" : "نامحدود کن"}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={busy === u.id}
                  onClick={() => apply(u, { action: "revoke" }, `اشتراک ${u.code} لغو شد`)}
                >
                  لغو اشتراک
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------- پلن‌ها ----------

const emptyPlan = { name: "", duration_days: "", price_toman: "", product_id: "" };

function PlansCard({ notify }: { notify: Notify }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setPlans(await getPlans());
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const duration = Number(form.duration_days);
    const price = Number(form.price_toman || "0");
    if (!form.name.trim() || !form.product_id.trim() || !(duration > 0) || !(price >= 0)) {
      notify("نام، شناسه‌ی محصول و مدت (روز) لازم است", "err");
      return;
    }
    setSaving(true);
    try {
      await savePlan({
        name: form.name.trim(),
        product_id: form.product_id.trim(),
        duration_days: duration,
        price_toman: price,
      });
      notify(`پلن «${form.name.trim()}» ذخیره شد`, "ok");
      setForm(emptyPlan);
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Plan) {
    if (!confirm(`پلن «${p.name}» حذف شود؟ خریدهای قبلی آن باقی می‌مانند.`)) return;
    try {
      await deletePlan(p.id);
      notify("پلن حذف شد", "ok");
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  return (
    <div className="card">
      <h2>پلن‌های فروش (کافه‌بازار)</h2>
      <p className="card-desc">
        هر پلن یک «محصول درون‌برنامه‌ای» در پیشخان کافه‌بازار است که خریدش این تعداد روز پرمیوم اضافه می‌کند؛
        خرید دوباره قبل از تمام شدن، روزها را روی هم می‌گذارد. «شناسه‌ی محصول» باید دقیقاً همان SKU ساخته‌شده در
        پیشخان باشد. قیمت واقعی را خود بازار از کاربر می‌گیرد؛ قیمت این‌جا فقط برای آمار فروش است. برای ویرایش، همان
        شناسه‌ی محصول را با مقادیر جدید دوباره ذخیره کن.
      </p>

      {plans === null ? (
        <p className="hint">در حال بارگذاری...</p>
      ) : plans.length === 0 ? (
        <p className="empty">هنوز پلنی تعریف نشده — اپ دکمه‌ی خرید نشان نمی‌دهد.</p>
      ) : (
        plans.map((p) => (
          <div className="row" key={p.id} style={{ justifyContent: "space-between", padding: "8px 0" }}>
            <span>
              <strong>{p.name}</strong> · {faNum(p.duration_days)} روز · {faNum(p.price_toman)} تومان ·{" "}
              <span className="mono" dir="ltr">
                {p.product_id}
              </span>{" "}
              <span className="pill ok">{faNum(p.purchase_count)} فروش</span>
            </span>
            <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
              حذف
            </button>
          </div>
        ))
      )}

      <div className="field" style={{ marginTop: 12 }}>
        <label>افزودن / ویرایش پلن</label>
        <div className="field-row">
          <input
            placeholder="نام، مثلاً یک ماهه"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            dir="ltr"
            placeholder="mathmotion_1m"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          />
        </div>
        <div className="field-row">
          <input
            dir="ltr"
            inputMode="numeric"
            placeholder="مدت (روز)، مثلاً 30"
            value={form.duration_days}
            onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
          />
          <input
            dir="ltr"
            inputMode="numeric"
            placeholder="قیمت (تومان)"
            value={form.price_toman}
            onChange={(e) => setForm({ ...form, price_toman: e.target.value })}
          />
          <button className="btn btn-sm" onClick={save} disabled={saving}>
            {saving ? "..." : "ذخیره‌ی پلن"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- توکن کافه‌بازار ----------

function BazaarTokenCard({ notify }: { notify: Notify }) {
  const [secret, setSecret] = useState<SecretItem | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setSecret((await getSettings()).bazaar_api_secret);
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    try {
      await updateSetting("BAZAAR_API_SECRET", value.trim());
      notify(value.trim() ? "توکن کافه‌بازار ذخیره شد" : "توکن ذخیره‌شده پاک شد (مقدار .env استفاده می‌شود)", "ok");
      setValue("");
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>توکن API پیشخان بازار</h2>
      <p className="card-desc">
        برای تأیید خریدها سمت سرور لازم است. از پیشخان کافه‌بازار ← برنامه ← «API پیشخان بازار» ← «دریافت توکن
        جدید» بگیر. همان لحظه روی خرید بعدی اعمال می‌شود.
      </p>
      <div className="field">
        <label>
          وضعیت{" "}
          {secret === null ? (
            "..."
          ) : secret.set ? (
            <span className="pill ok">
              تنظیم شده <span dir="ltr">{secret.masked}</span>
            </span>
          ) : (
            <span className="pill err">تنظیم نشده — خریدها تأیید نمی‌شوند</span>
          )}
        </label>
        <div className="field-row">
          <input
            dir="ltr"
            type="password"
            placeholder="توکن جدید"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="btn btn-sm" onClick={save} disabled={saving}>
            {saving ? "..." : "ذخیره"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- پیامک (sms.ir) ----------

function SmsCard({ notify }: { notify: Notify }) {
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    try {
      setSettings(await getSettings());
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(key: string, value: string, msg: string, reset: () => void) {
    setSaving(key);
    try {
      await updateSetting(key, value.trim());
      notify(msg, "ok");
      reset();
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setSaving(null);
    }
  }

  const ready = settings && settings.sms_ir_api_key.set && settings.sms_ir_otp_template_id;

  return (
    <div className="card">
      <h2>ورود و پیامک (sms.ir)</h2>
      <p className="card-desc">
        برای کد تایید ثبت‌نام و فراموشی رمز. در پنل sms.ir یک قالب «ارسال سریع» بساز که متنش پارامتر{" "}
        <span className="mono" dir="ltr">#CODE#</span> داشته باشد و شناسه‌ی آن قالب را این‌جا وارد کن. بدون این
        دو، کاربر جدید نمی‌تواند ثبت‌نام کند.
      </p>
      <div className="field">
        <label>
          وضعیت{" "}
          {settings === null ? "..." : ready ? (
            <span className="pill ok">آماده</span>
          ) : (
            <span className="pill err">تنظیم نشده — پیامک ارسال نمی‌شود</span>
          )}
        </label>
      </div>
      <div className="field">
        <label>
          کلید API{" "}
          {settings?.sms_ir_api_key.set && (
            <span className="pill ok" dir="ltr">
              {settings.sms_ir_api_key.masked}
            </span>
          )}
        </label>
        <div className="field-row">
          <input
            dir="ltr"
            type="password"
            placeholder="کلید API جدید"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            className="btn btn-sm"
            disabled={saving === "SMS_IR_API_KEY"}
            onClick={() => save("SMS_IR_API_KEY", apiKey, "کلید sms.ir ذخیره شد", () => setApiKey(""))}
          >
            ذخیره
          </button>
        </div>
      </div>
      <div className="field">
        <label>
          شناسه‌ی قالب OTP{" "}
          {settings?.sms_ir_otp_template_id && <span className="pill ok">فعلی: {settings.sms_ir_otp_template_id}</span>}
        </label>
        <div className="field-row">
          <input
            dir="ltr"
            inputMode="numeric"
            placeholder="مثلاً 123456"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          />
          <button
            className="btn btn-sm"
            disabled={saving === "SMS_IR_OTP_TEMPLATE_ID"}
            onClick={() =>
              save("SMS_IR_OTP_TEMPLATE_ID", templateId, "شناسه‌ی قالب ذخیره شد", () => setTemplateId(""))
            }
          >
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
