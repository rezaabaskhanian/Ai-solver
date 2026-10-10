"use client";

import { useState } from "react";
import { generateKonkurGuide } from "@/lib/api";
import type { KonkurGuide, KonkurLine, KonkurQuestion } from "@/lib/types";
import LinesEditor from "./LinesEditor";

// ویرایشگر «مسیر حل»: چیزی که دانش‌آموز قبل از دیدن پاسخ تشریحی می‌بیند —
// داده‌ها و خواسته‌ی سؤال، راهنمایی‌های پله‌ای (از کلی به جزئی، بدون لو دادن جواب) و دام تست.
export default function GuideEditor({
  guide,
  onChange,
  question,
  notify,
}: {
  guide: KonkurGuide;
  onChange: (g: KonkurGuide) => void;
  // سؤالِ فعلی فرم، برای پیشنهاد هوش مصنوعی
  question: () => KonkurQuestion;
  notify: (msg: string, type?: "ok" | "err") => void;
}) {
  const [busy, setBusy] = useState(false);
  const hints = guide.hints || [];

  function setHint(i: number, lines: KonkurLine[]) {
    onChange({ ...guide, hints: hints.map((h, idx) => (idx === i ? lines : h)) });
  }

  async function suggest() {
    const hasContent = !!(guide.given?.length || guide.asked?.length || hints.length || guide.trap?.length);
    if (hasContent && !confirm("مسیر حل فعلی با پیشنهاد هوش مصنوعی جایگزین شود؟")) return;
    setBusy(true);
    try {
      const g = await generateKonkurGuide(question());
      onChange(g);
      notify("پیشنهاد هوش مصنوعی آمد؛ قبل از ذخیره بازبینی کن.");
    } catch (e: any) {
      notify(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="field" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
      <legend style={{ fontSize: 13, padding: "0 6px" }}>مسیر حل (اختیاری) — قبل از پاسخ تشریحی به دانش‌آموز نشان داده می‌شود</legend>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button type="button" className="btn btn-sm" onClick={suggest} disabled={busy}>
          {busy ? "در حال ساخت..." : "پیشنهاد با هوش مصنوعی"}
        </button>
        <span className="hint">بدون مسیر حل، اپ نکته‌ی سؤال و قدم اول پاسخ را به‌عنوان راهنمایی نشان می‌دهد.</span>
      </div>
      <LinesEditor label="سؤال چی داده؟ (داده‌ها)" lines={guide.given || []} onChange={(given) => onChange({ ...guide, given })} />
      <LinesEditor label="چی خواسته؟" lines={guide.asked || []} onChange={(asked) => onChange({ ...guide, asked })} />
      {hints.map((h, i) => (
        <div key={i} style={{ position: "relative" }}>
          <LinesEditor label={`راهنمایی ${i + 1}`} lines={h} onChange={(lines) => setHint(i, lines)} />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ position: "absolute", top: 0, left: 0 }}
            onClick={() => onChange({ ...guide, hints: hints.filter((_, idx) => idx !== i) })}
          >
            حذف راهنمایی
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 8 }}
        onClick={() => onChange({ ...guide, hints: [...hints, [""]] })}
      >
        + راهنمایی
      </button>
      <LinesEditor label="دام تست (اشتباه رایج)" lines={guide.trap || []} onChange={(trap) => onChange({ ...guide, trap })} />
    </fieldset>
  );
}

const filled = (lines: KonkurLine[] | undefined) =>
  (lines || []).filter((l) => (typeof l === "string" ? l.trim() !== "" : l.math.trim() !== ""));

// خط‌ها و راهنمایی‌های خالی را حذف می‌کند؛ اگر چیزی نماند undefined.
export function cleanGuide(g: KonkurGuide | undefined): KonkurGuide | undefined {
  if (!g) return undefined;
  const out: KonkurGuide = {};
  const given = filled(g.given);
  const asked = filled(g.asked);
  const trap = filled(g.trap);
  const hints = (g.hints || []).map(filled).filter((h) => h.length > 0);
  if (given.length) out.given = given;
  if (asked.length) out.asked = asked;
  if (hints.length) out.hints = hints;
  if (trap.length) out.trap = trap;
  return Object.keys(out).length ? out : undefined;
}
