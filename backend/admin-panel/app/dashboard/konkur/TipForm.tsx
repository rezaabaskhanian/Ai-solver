"use client";

import { useState } from "react";
import type { KonkurGrade, KonkurLine, KonkurTip } from "@/lib/types";
import LinesEditor from "./LinesEditor";

export const GRADES: KonkurGrade[] = [7, 8, 9, 10, 11, 12];

export const emptyTip: KonkurTip = { id: "", grade: null, title: "", body: [""] };

// data ناقصِ پیش‌نویس را به یک KonkurTip کامل (برای فرم) تبدیل می‌کند.
export function normalizeTip(d: Record<string, unknown> | undefined): KonkurTip {
  const x = (d || {}) as Partial<KonkurTip>;
  const g = x.grade;
  return {
    id: typeof x.id === "string" ? x.id : "",
    grade: typeof g === "number" && GRADES.includes(g as KonkurGrade) ? (g as KonkurGrade) : null,
    chapterId: typeof x.chapterId === "string" && x.chapterId ? x.chapterId : undefined,
    title: typeof x.title === "string" ? x.title : "",
    body: Array.isArray(x.body) ? (x.body as KonkurLine[]) : [],
    example:
      x.example && typeof x.example === "object"
        ? {
            question: Array.isArray(x.example.question) ? x.example.question : [],
            solution: Array.isArray(x.example.solution) ? x.example.solution : [],
          }
        : undefined,
  };
}

// خط‌های خالی حذف می‌شوند و example خالی نادیده گرفته می‌شود.
function cleanLines(lines: KonkurLine[]): KonkurLine[] {
  return lines.filter((l) => (typeof l === "string" ? l.trim() !== "" : l.math.trim() !== ""));
}

export default function TipForm({
  initial,
  isEdit,
  saving,
  onSubmit,
  onCancel,
  submitLabel = "ذخیره",
  extraActions,
  lenient,
  onApprove,
}: {
  initial: KonkurTip;
  isEdit?: boolean;
  saving?: boolean;
  onSubmit: (tip: KonkurTip) => void;
  onCancel?: () => void;
  submitLabel?: string;
  extraActions?: React.ReactNode;
  // true: ذخیره بدون اعتبارسنجی (پیش‌نویس ناقص)
  lenient?: boolean;
  // اگر بدهید، دکمه‌ی «تأیید» (با اعتبارسنجی کامل) نمایش داده می‌شود
  onApprove?: (tip: KonkurTip) => void;
}) {
  const [tip, setTip] = useState<KonkurTip>(initial);
  const [err, setErr] = useState("");
  const hasExample = !!tip.example;

  function build(strict: boolean): KonkurTip | null {
    const fail = (m: string) => {
      if (strict) setErr(m);
      return strict;
    };
    if (!tip.id.trim() && fail("شناسه را وارد کن.")) return null;
    if (!tip.title.trim() && fail("عنوان را وارد کن.")) return null;
    const body = cleanLines(tip.body);
    if (body.length === 0 && fail("متن نکته نباید خالی باشد.")) return null;
    setErr("");
    const out: KonkurTip = {
      id: tip.id.trim(),
      grade: tip.grade,
      title: tip.title.trim(),
      body,
    };
    if (tip.chapterId && tip.chapterId.trim()) out.chapterId = tip.chapterId.trim();
    if (tip.example) {
      const q = cleanLines(tip.example.question);
      const s = cleanLines(tip.example.solution);
      if (q.length || s.length) out.example = { question: q, solution: s };
    }
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
      <label className="field">
        شناسه
        <input
          dir="ltr"
          value={tip.id}
          disabled={isEdit}
          onChange={(e) => setTip({ ...tip, id: e.target.value })}
          placeholder="مثلاً tip-limit-1"
        />
      </label>
      <label className="field">
        پایه
        <select
          value={tip.grade === null ? "" : String(tip.grade)}
          onChange={(e) => setTip({ ...tip, grade: e.target.value === "" ? null : (Number(e.target.value) as KonkurGrade) })}
        >
          <option value="">عمومی</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              پایه‌ی {g}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        شناسه‌ی فصل (اختیاری)
        <input dir="ltr" value={tip.chapterId || ""} onChange={(e) => setTip({ ...tip, chapterId: e.target.value })} />
      </label>
      <label className="field">
        عنوان
        <input value={tip.title} onChange={(e) => setTip({ ...tip, title: e.target.value })} />
      </label>
      <LinesEditor label="متن نکته" lines={tip.body} onChange={(body) => setTip({ ...tip, body })} />

      <label>
        <input
          type="checkbox"
          checked={hasExample}
          onChange={(e) =>
            setTip({ ...tip, example: e.target.checked ? tip.example || { question: [""], solution: [""] } : undefined })
          }
        />{" "}
        مثال دارد
      </label>
      {tip.example && (
        <>
          <LinesEditor
            label="صورت مثال"
            lines={tip.example.question}
            onChange={(question) => setTip({ ...tip, example: { question, solution: tip.example!.solution } })}
          />
          <LinesEditor
            label="حل مثال"
            lines={tip.example.solution}
            onChange={(solution) => setTip({ ...tip, example: { question: tip.example!.question, solution } })}
          />
        </>
      )}

      {err && <div className="warn-box" role="alert">{err}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-sm" onClick={submit} disabled={saving}>
          {saving ? "..." : submitLabel}
        </button>
        {onApprove && (
          <button type="button" className="btn btn-sm" onClick={approve} disabled={saving}>
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
