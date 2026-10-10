"use client";

import { useRef, useState } from "react";
import { assetUrl, uploadImage } from "@/lib/api";
import type { KonkurLine, KonkurQuestion, KonkurSource, KonkurTrack } from "@/lib/types";
import GuideEditor, { cleanGuide } from "./GuideEditor";
import LinesEditor from "./LinesEditor";

export const emptyQuestion: KonkurQuestion = {
  id: "",
  tipIds: [],
  text: "",
  choices: ["", "", "", ""],
  choicesMath: true,
  answer: 0,
  solution: [],
  source: { kind: "authored" },
};

// data ناقصِ پیش‌نویس را به یک KonkurQuestion کامل (برای فرم) تبدیل می‌کند.
export function normalizeQuestion(d: Record<string, unknown> | undefined): KonkurQuestion {
  const x = (d || {}) as Partial<KonkurQuestion> & { figure?: unknown };
  const ch = Array.isArray(x.choices) ? x.choices.map((c) => (typeof c === "string" ? c : String(c ?? ""))) : [];
  while (ch.length < 4) ch.push("");
  const ans = x.answer;
  const src = x.source as KonkurSource | undefined;
  return {
    id: typeof x.id === "string" ? x.id : "",
    tipIds: Array.isArray(x.tipIds) ? x.tipIds.filter((t): t is string => typeof t === "string") : [],
    text: typeof x.text === "string" ? x.text : "",
    expression: typeof x.expression === "string" && x.expression ? x.expression : undefined,
    figureUrl: typeof x.figureUrl === "string" && x.figureUrl ? x.figureUrl : undefined,
    choices: [ch[0], ch[1], ch[2], ch[3]],
    choicesMath: x.choicesMath !== false,
    answer: ans === 0 || ans === 1 || ans === 2 || ans === 3 ? ans : 0,
    solution: Array.isArray(x.solution) ? (x.solution as KonkurLine[]) : [],
    guide: x.guide && typeof x.guide === "object" ? x.guide : undefined,
    source:
      src && src.kind === "konkur"
        ? src
        : { kind: "authored" },
  };
}

const CHOICE_LABELS = ["۱", "۲", "۳", "۴"];

export default function QuestionForm({
  initial,
  isEdit,
  saving,
  onSubmit,
  onCancel,
  submitLabel = "ذخیره",
  extraActions,
  notify,
  lenient,
  onApprove,
}: {
  initial: KonkurQuestion;
  isEdit?: boolean;
  saving?: boolean;
  onSubmit: (q: KonkurQuestion) => void;
  onCancel?: () => void;
  submitLabel?: string;
  extraActions?: React.ReactNode;
  notify: (msg: string, type?: "ok" | "err") => void;
  // true: ذخیره بدون اعتبارسنجی (پیش‌نویس ناقص)
  lenient?: boolean;
  // اگر بدهید، دکمه‌ی «تأیید» (با اعتبارسنجی کامل) نمایش داده می‌شود
  onApprove?: (q: KonkurQuestion) => void;
}) {
  const [q, setQ] = useState<KonkurQuestion>(initial);
  const [tipIdsText, setTipIdsText] = useState(initial.tipIds.join(", "));
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const src = q.source;
  const konkur = src.kind === "konkur" ? src : null;

  function setKonkur(patch: Partial<Extract<KonkurSource, { kind: "konkur" }>>) {
    if (!konkur) return;
    setQ({ ...q, source: { ...konkur, ...patch } });
  }

  function setChoice(i: number, v: string) {
    const c = [...q.choices] as KonkurQuestion["choices"];
    c[i] = v;
    setQ({ ...q, choices: c });
  }

  async function handleFigure(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setQ((prev) => ({ ...prev, figureUrl: url }));
    } catch (e: any) {
      notify(e.message, "err");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function build(strict: boolean): KonkurQuestion | null {
    const fail = (m: string) => {
      if (strict) setErr(m);
      return strict;
    };
    const tipIds = tipIdsText
      .split(/[,،\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!q.id.trim() && fail("شناسه را وارد کن.")) return null;
    if (!q.text.trim() && fail("متن سؤال را وارد کن.")) return null;
    if (q.choices.some((c) => !c.trim()) && fail("هر ۴ گزینه باید پر باشند.")) return null;
    if (tipIds.length === 0 && fail("حداقل یک شناسه‌ی نکته لازم است.")) return null;
    if (konkur && (!Number.isFinite(konkur.year) || konkur.year <= 0) && fail("سال کنکور را وارد کن.")) return null;
    setErr("");
    const out: KonkurQuestion = {
      id: q.id.trim(),
      tipIds,
      text: q.text.trim(),
      choices: q.choices,
      choicesMath: q.choicesMath,
      answer: q.answer,
      solution: q.solution.filter((l) => (typeof l === "string" ? l.trim() !== "" : l.math.trim() !== "")),
      source: q.source,
    };
    if (q.expression && q.expression.trim()) out.expression = q.expression.trim();
    if (q.figureUrl) out.figureUrl = q.figureUrl;
    const guide = cleanGuide(q.guide);
    if (guide) out.guide = guide;
    return out;
  }

  function submit() {
    const out = build(!lenient);
    if (out) onSubmit(out);
  }

  function approve() {
    const out = build(true);
    if (out && onApprove) onApprove(out);
  }

  const choicesMath = q.choicesMath !== false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
      <label className="field">
        شناسه
        <input dir="ltr" value={q.id} disabled={isEdit} onChange={(e) => setQ({ ...q, id: e.target.value })} />
      </label>
      <label className="field">
        شناسه‌ی نکته‌ها (با کاما جدا کن؛ اولی نکته‌ی اصلی است)
        <input dir="ltr" value={tipIdsText} onChange={(e) => setTipIdsText(e.target.value)} placeholder="tip-a, tip-b" />
      </label>
      <label className="field">
        متن سؤال
        <textarea rows={3} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} />
      </label>
      <label className="field">
        عبارت ریاضی (اختیاری)
        <textarea
          rows={1}
          className="mono"
          dir="ltr"
          style={{ textAlign: "left" }}
          value={q.expression || ""}
          onChange={(e) => setQ({ ...q, expression: e.target.value })}
        />
      </label>

      <fieldset className="field" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
        <legend style={{ fontSize: 13, padding: "0 6px" }}>گزینه‌ها (دکمه‌ی رادیویی = پاسخ صحیح)</legend>
        <label style={{ display: "block", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={choicesMath}
            onChange={(e) => setQ({ ...q, choicesMath: e.target.checked })}
          />{" "}
          گزینه‌ها ریاضی هستند
        </label>
        {q.choices.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="radio"
              name={`answer-${initial.id || "new"}`}
              checked={q.answer === i}
              onChange={() => setQ({ ...q, answer: i as 0 | 1 | 2 | 3 })}
              aria-label={`گزینه ${CHOICE_LABELS[i]} پاسخ صحیح است`}
            />
            <span>{CHOICE_LABELS[i]}</span>
            <input
              aria-label={`گزینه ${CHOICE_LABELS[i]}`}
              className={choicesMath ? "mono" : undefined}
              dir={choicesMath ? "ltr" : "rtl"}
              style={{ flex: 1, minWidth: 0, ...(choicesMath ? { textAlign: "left" } : {}) }}
              value={c}
              onChange={(e) => setChoice(i, e.target.value)}
            />
          </div>
        ))}
      </fieldset>

      <LinesEditor label="پاسخ تشریحی" lines={q.solution} onChange={(solution) => setQ({ ...q, solution })} />

      <GuideEditor
        guide={q.guide || {}}
        onChange={(guide) => setQ((prev) => ({ ...prev, guide }))}
        question={() => ({ ...q, tipIds: [], guide: undefined })}
        notify={notify}
      />

      <fieldset className="field" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
        <legend style={{ fontSize: 13, padding: "0 6px" }}>منبع</legend>
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <label>
            <input
              type="radio"
              name={`src-${initial.id || "new"}`}
              checked={!konkur}
              onChange={() => setQ({ ...q, source: { kind: "authored" } })}
            />{" "}
            تألیفی
          </label>
          <label>
            <input
              type="radio"
              name={`src-${initial.id || "new"}`}
              checked={!!konkur}
              onChange={() => setQ({ ...q, source: { kind: "konkur", year: 1402, track: "riazi" } })}
            />{" "}
            کنکور
          </label>
        </div>
        {konkur && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              سال{" "}
              <input
                type="number"
                style={{ width: 90 }}
                value={konkur.year || ""}
                onChange={(e) => setKonkur({ year: Number(e.target.value) })}
              />
            </label>
            <label>
              رشته{" "}
              <select value={konkur.track} onChange={(e) => setKonkur({ track: e.target.value as KonkurTrack })}>
                <option value="riazi">ریاضی</option>
                <option value="tajrobi">تجربی</option>
              </select>
            </label>
            <label>
              شماره{" "}
              <input
                type="number"
                style={{ width: 80 }}
                value={konkur.number ?? ""}
                onChange={(e) => setKonkur({ number: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </label>
            <label>
              نوبت{" "}
              <select
                value={konkur.round ?? ""}
                onChange={(e) => setKonkur({ round: e.target.value === "" ? undefined : (Number(e.target.value) as 1 | 2) })}
              >
                <option value="">—</option>
                <option value="1">اول</option>
                <option value="2">دوم</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={!!konkur.abroad} onChange={(e) => setKonkur({ abroad: e.target.checked || undefined })} />{" "}
              خارج از کشور
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!konkur.newSystem}
                onChange={(e) => setKonkur({ newSystem: e.target.checked || undefined })}
              />{" "}
              نظام جدید
            </label>
          </div>
        )}
      </fieldset>

      <div className="field">
        <div style={{ fontSize: 13, marginBottom: 6 }}>شکل (اختیاری)</div>
        {q.figureUrl && (
          <div style={{ marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(q.figureUrl)}
              alt="پیش‌نمایش شکل سؤال"
              style={{ maxWidth: 320, maxHeight: 240, border: "1px solid var(--border)", borderRadius: 8 }}
            />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            aria-label="آپلود شکل"
            disabled={uploading}
            onChange={(e) => handleFigure(e.target.files?.[0])}
          />
          {uploading && <span className="hint">در حال آپلود...</span>}
          {q.figureUrl && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ({ ...q, figureUrl: undefined })}>
              حذف شکل
            </button>
          )}
        </div>
      </div>

      {err && <div className="warn-box" role="alert">{err}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-sm" onClick={submit} disabled={saving || uploading}>
          {saving ? "..." : submitLabel}
        </button>
        {onApprove && (
          <button type="button" className="btn btn-sm" onClick={approve} disabled={saving || uploading}>
            تأیید
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            انصراف
          </button>
        )}
        {extraActions}
      </div>
    </div>
  );
}
