"use client";

import { useCallback, useEffect, useState } from "react";
import { applyKonkurSeed, getKonkurSeedStatus } from "@/lib/api";
import type { KonkurSeedResult, KonkurSeedStatus } from "@/lib/types";
import type { Notify } from "./types";

export default function SeedSection({ notify }: { notify: Notify }) {
  const [status, setStatus] = useState<KonkurSeedStatus | null>(null);
  const [result, setResult] = useState<KonkurSeedResult | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getKonkurSeedStatus());
    } catch (err: any) {
      notify(err.message, "err");
    }
  // notify may change identity every render; load once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const missing = status ? status.missing_tips + status.missing_questions : 0;

  async function run() {
    const msg = overwrite
      ? "هشدار: همه‌ی نکته‌ها و سؤال‌های آماده‌ی اپ جایگزین نسخه‌ی روی سرور می‌شوند و هر ویرایش دستی روی آن‌ها از بین می‌رود. ادامه می‌دهی؟"
      : `${status?.missing_tips ?? 0} نکته و ${status?.missing_questions ?? 0} سؤال که هنوز روی سرور نیستند اضافه شوند؟ (چیزی که قبلاً ویرایش کرده‌ای دست نمی‌خورد)`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const res = await applyKonkurSeed(overwrite);
      setResult(res);
      notify("محتوای اولیه بارگذاری شد", "ok");
      setOverwrite(false);
      await load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>محتوای آماده‌ی اپ</h2>
      <p className="card-desc">
        نکته‌ها و سؤال‌هایی که همراه خود اپ است داخل سرور هم هست. با یک کلیک روی سرور بارگذاری می‌شود تا محتوای بعدی بدون انتشار نسخه‌ی
        جدید اپ تغییر کند. فقط مواردی اضافه می‌شود که هنوز روی سرور نیستند.
      </p>

      {status ? (
        <p>
          در بسته‌ی اپ: {status.tips} نکته، {status.questions} سؤال، {status.figures} تصویر.{" "}
          {missing === 0 ? (
            <strong>همه‌چیز روی سرور هست.</strong>
          ) : (
            <strong>
              روی سرور نیست: {status.missing_tips} نکته و {status.missing_questions} سؤال.
            </strong>
          )}
        </p>
      ) : (
        <p>در حال بررسی...</p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" onClick={run} disabled={busy || !status || (!overwrite && missing === 0)}>
          {busy ? "..." : "بارگذاری محتوای اولیه روی سرور"}
        </button>
        <label style={{ fontSize: 13 }}>
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> جایگزینی همه (حذف
          ویرایش‌های دستی)
        </label>
      </div>
      {overwrite && (
        <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>
          هشدار: با این گزینه همه‌ی موارد آماده‌ی اپ دوباره روی سرور نوشته می‌شوند و هر تغییری که خودت در پنل داده‌ای از بین می‌رود.
        </p>
      )}

      {result && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <div>
            اضافه شد: {result.added_tips} نکته، {result.added_questions} سؤال، {result.figures_copied} تصویر جدید.
          </div>
          <div>
            ردشده چون از قبل بود: {result.skipped_tips} نکته، {result.skipped_questions} سؤال.
          </div>
          <div>
            نامعتبر (وارد نشد): {result.invalid_tips} نکته، {result.invalid_questions} سؤال.
          </div>
          {result.problems.length > 0 && (
            <ul>
              {result.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
