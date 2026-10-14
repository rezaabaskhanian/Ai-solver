"use client";

import { useEffect, useRef, useState } from "react";
import { assetUrl, listKonkurTips, uploadImage } from "@/lib/api";
import { TEXTBOOKS, findBook } from "@/lib/textbooks";
import type { KonkurLine, KonkurTip, TextbookExercise, TextbookExercisePart, TextbookSection } from "@/lib/types";
import GuideEditor, { cleanGuide } from "./GuideEditor";
import LinesEditor from "./LinesEditor";

export const SECTION_LABELS: Record<TextbookSection, string> = {
  exercise: "تمرین",
  classwork: "کار در کلاس",
  activity: "فعالیت",
};

const PART_LABELS = ["الف", "ب", "پ", "ت", "ث", "ج", "چ", "ح"];

export const emptyExercise: TextbookExercise = {
  id: "",
  bookId: "math9",
  chapterId: "",
  section: "exercise",
  page: 0,
  number: 0,
  text: [],
  solution: [],
};

const asLines = (v: unknown): KonkurLine[] =>
  Array.isArray(v)
    ? v.filter(
        (l): l is KonkurLine =>
          typeof l === "string" || (!!l && typeof l === "object" && typeof (l as { math?: unknown }).math === "string")
      )
    : [];

const filled = (lines: KonkurLine[] | undefined) =>
  (lines || []).filter((l) => (typeof l === "string" ? l.trim() !== "" : l.math.trim() !== ""));

// data ناقصِ پیش‌نویس را به یک TextbookExercise کامل (برای فرم) تبدیل می‌کند.
export function normalizeExercise(d: Record<string, unknown> | undefined): TextbookExercise {
  const x = (d || {}) as Partial<TextbookExercise>;
  const section: TextbookSection =
    x.section === "classwork" || x.section === "activity" ? x.section : "exercise";
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    id: typeof x.id === "string" ? x.id : "",
    bookId: typeof x.bookId === "string" && x.bookId ? x.bookId : "math9",
    chapterId: typeof x.chapterId === "string" ? x.chapterId : "",
    lesson: num(x.lesson) || undefined,
    section,
    page: num(x.page),
    number: num(x.number),
    text: asLines(x.text),
    figureUrl: typeof x.figureUrl === "string" && x.figureUrl ? x.figureUrl : undefined,
    parts: Array.isArray(x.parts)
      ? x.parts.map((p) => ({
          label: typeof p?.label === "string" ? p.label : "",
          text: asLines(p?.text),
          answer: asLines(p?.answer),
          solution: asLines(p?.solution),
        }))
      : [],
    answer: asLines(x.answer),
    solution: asLines(x.solution),
    guide: x.guide && typeof x.guide === "object" ? x.guide : undefined,
    tipIds: Array.isArray(x.tipIds) ? x.tipIds.filter((t): t is string => typeof t === "string") : [],
    free: x.free === true,
  };
}

// همان قاعده‌ی سرور: book-pPAGE-NUMBER (+ -classwork / -activity)
export function deriveExerciseId(e: Pick<TextbookExercise, "bookId" | "page" | "number" | "section">): string {
  if (!e.bookId || e.page <= 0 || e.number <= 0) return "";
  return `${e.bookId}-p${e.page}-${e.number}${e.section !== "exercise" ? `-${e.section}` : ""}`;
}

export default function ExerciseForm({
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
  initial: TextbookExercise;
  isEdit?: boolean;
  saving?: boolean;
  onSubmit: (e: TextbookExercise) => void;
  onCancel?: () => void;
  submitLabel?: string;
  extraActions?: React.ReactNode;
  notify: (msg: string, type?: "ok" | "err") => void;
  // true: ذخیره بدون اعتبارسنجی (پیش‌نویس ناقص)
  lenient?: boolean;
  onApprove?: (e: TextbookExercise) => void;
}) {
  const [ex, setEx] = useState<TextbookExercise>({ ...initial, parts: initial.parts || [] });
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [allTips, setAllTips] = useState<KonkurTip[]>([]);

  useEffect(() => {
    listKonkurTips()
      .then(setAllTips)
      .catch(() => {});
  }, []);

  const book = findBook(ex.bookId);
  const tipIds = ex.tipIds || [];
  const chapterTips = allTips.filter((t) => t.chapterId === ex.chapterId);
  // نکته‌ای که انتخاب شده ولی دیگر در این فصل نیست هم نمایش داده می‌شود تا گم نشود.
  const otherSelected = tipIds.filter((id) => !chapterTips.some((t) => t.id === id));

  function toggleTip(id: string) {
    setEx({ ...ex, tipIds: tipIds.includes(id) ? tipIds.filter((x) => x !== id) : [...tipIds, id] });
  }
  const chapter = book?.chapters.find((c) => c.id === ex.chapterId);
  const parts = ex.parts || [];

  function setPart(i: number, patch: Partial<TextbookExercisePart>) {
    setEx({ ...ex, parts: parts.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  }

  async function handleFigure(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setEx((prev) => ({ ...prev, figureUrl: url }));
    } catch (e: any) {
      notify(e.message, "err");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function build(strict: boolean): TextbookExercise | null {
    const fail = (m: string) => {
      if (strict) setErr(m);
      return strict;
    };
    const cleanParts = parts
      .map((p) => ({ label: p.label.trim(), text: filled(p.text), answer: filled(p.answer), solution: filled(p.solution) }))
      .filter((p) => p.label || p.text.length || p.solution.length);
    const solution = filled(ex.solution);
    if (!ex.chapterId && fail("فصل را انتخاب کن.")) return null;
    if (!(ex.page > 0) && fail("شماره‌ی صفحه را وارد کن.")) return null;
    if (!(ex.number > 0) && fail("شماره‌ی تمرین را وارد کن.")) return null;
    if (filled(ex.text).length === 0 && cleanParts.length === 0 && fail("صورت تمرین را وارد کن.")) return null;
    if (cleanParts.length === 0 && solution.length === 0 && fail("راه‌حل را بنویس.")) return null;
    if (cleanParts.some((p) => !p.label || p.text.length === 0) && fail("هر قسمت برچسب و صورت لازم دارد.")) return null;
    if (solution.length === 0 && cleanParts.some((p) => p.solution.length === 0) && fail("هر قسمت راه‌حل لازم دارد.")) return null;
    setErr("");

    const out: TextbookExercise = {
      id: (isEdit ? ex.id : ex.id.trim() || deriveExerciseId(ex)).trim(),
      bookId: ex.bookId,
      chapterId: ex.chapterId,
      section: ex.section,
      page: ex.page,
      number: ex.number,
      text: filled(ex.text),
      solution,
    };
    if (ex.lesson && ex.lesson > 0) out.lesson = ex.lesson;
    if (ex.figureUrl) out.figureUrl = ex.figureUrl;
    if (cleanParts.length) {
      out.parts = cleanParts.map((p) => {
        const part: TextbookExercisePart = { label: p.label, text: p.text, solution: p.solution };
        if (p.answer.length) part.answer = p.answer;
        return part;
      });
    }
    const answer = filled(ex.answer);
    if (answer.length) out.answer = answer;
    const guide = cleanGuide(ex.guide);
    if (guide) out.guide = guide;
    if (tipIds.length) out.tipIds = tipIds;
    if (ex.free) out.free = true;
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

  const autoId = deriveExerciseId(ex);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 760 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="field">
          کتاب
          <select value={ex.bookId} onChange={(e) => setEx({ ...ex, bookId: e.target.value, chapterId: "", lesson: undefined })}>
            {TEXTBOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} (پایه‌ی {b.grade})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          فصل
          <select value={ex.chapterId} onChange={(e) => setEx({ ...ex, chapterId: e.target.value, lesson: undefined })}>
            <option value="">— انتخاب کن —</option>
            {book?.chapters.map((c, i) => (
              <option key={c.id} value={c.id}>
                فصل {i + 1}: {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          درس
          <select
            value={ex.lesson ?? ""}
            onChange={(e) => setEx({ ...ex, lesson: e.target.value === "" ? undefined : Number(e.target.value) })}
          >
            <option value="">—</option>
            {chapter?.lessons.map((l, i) => (
              <option key={i} value={i + 1}>
                درس {i + 1}: {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="field">
          نوع
          <select value={ex.section} onChange={(e) => setEx({ ...ex, section: e.target.value as TextbookSection })}>
            {(Object.keys(SECTION_LABELS) as TextbookSection[]).map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          صفحه
          <input
            type="number"
            style={{ width: 90 }}
            value={ex.page || ""}
            onChange={(e) => setEx({ ...ex, page: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="field">
          شماره
          <input
            type="number"
            style={{ width: 80 }}
            value={ex.number || ""}
            onChange={(e) => setEx({ ...ex, number: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="field">
          شناسه
          <input
            dir="ltr"
            value={ex.id}
            disabled={isEdit}
            placeholder={autoId || "خودکار"}
            onChange={(e) => setEx({ ...ex, id: e.target.value })}
          />
        </label>
        <label style={{ paddingBottom: 8 }}>
          <input type="checkbox" checked={!!ex.free} onChange={(e) => setEx({ ...ex, free: e.target.checked })} /> رایگان
        </label>
      </div>
      <span className="hint">
        صورت تمرین عین کتاب نوشته شود. راه‌حل را خودمان و ساده بنویسیم؛ از هیچ کتاب یا سایت حلی کپی نشود. درس اول هر فصل در اپ همیشه رایگان است.
      </span>

      <LinesEditor label="صورت تمرین (عین کتاب)" lines={ex.text} onChange={(text) => setEx({ ...ex, text })} />

      <fieldset className="field" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
        <legend style={{ fontSize: 13, padding: "0 6px" }}>قسمت‌ها (اگر تمرین الف، ب، ... دارد)</legend>
        {parts.length === 0 && <p className="hint">این تمرین قسمت ندارد.</p>}
        {parts.map((p, i) => (
          <div key={i} style={{ borderBottom: "1px dashed var(--border)", paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <label>
                برچسب{" "}
                <input style={{ width: 70 }} value={p.label} onChange={(e) => setPart(i, { label: e.target.value })} />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEx({ ...ex, parts: parts.filter((_, idx) => idx !== i) })}
              >
                حذف قسمت
              </button>
            </div>
            <LinesEditor label={`صورت قسمت ${p.label || i + 1}`} lines={p.text} onChange={(text) => setPart(i, { text })} />
            <LinesEditor label={`جواب نهایی ${p.label || i + 1} (اختیاری)`} lines={p.answer || []} onChange={(answer) => setPart(i, { answer })} />
            <LinesEditor label={`راه‌حل ${p.label || i + 1}`} lines={p.solution} onChange={(solution) => setPart(i, { solution })} />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            setEx({ ...ex, parts: [...parts, { label: PART_LABELS[parts.length] || "", text: [""], solution: [""] }] })
          }
        >
          + قسمت
        </button>
      </fieldset>

      <LinesEditor label="جواب نهایی (اختیاری، کوتاه)" lines={ex.answer || []} onChange={(answer) => setEx({ ...ex, answer })} />
      <LinesEditor
        label={parts.length ? "راه‌حل کلی (اختیاری وقتی هر قسمت راه‌حل دارد)" : "راه‌حل گام‌به‌گام"}
        lines={ex.solution}
        onChange={(solution) => setEx({ ...ex, solution })}
      />

      <fieldset className="field" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
        <legend style={{ fontSize: 13, padding: "0 6px" }}>نکته‌های استفاده‌شده در راه‌حل (از جزوه / نکته‌های این فصل)</legend>
        {!ex.chapterId ? (
          <p className="hint">اول فصل را انتخاب کن.</p>
        ) : chapterTips.length === 0 && otherSelected.length === 0 ? (
          <p className="hint">این فصل هنوز نکته‌ای ندارد. جزوه‌ی فصل را در «آپلود PDF» با نوع «جزوه‌ی آموزشی» بفرست.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {chapterTips.map((t) => (
              <label key={t.id} style={{ fontSize: 13 }}>
                <input type="checkbox" checked={tipIds.includes(t.id)} onChange={() => toggleTip(t.id)} /> {t.title}{" "}
                <span className="mono" dir="ltr" style={{ opacity: 0.5 }}>
                  {t.id}
                </span>
              </label>
            ))}
            {otherSelected.map((id) => (
              <label key={id} style={{ fontSize: 13 }}>
                <input type="checkbox" checked onChange={() => toggleTip(id)} />{" "}
                <span className="mono" dir="ltr">
                  {id}
                </span>{" "}
                <span className="hint">(در این فصل نیست)</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <GuideEditor guide={ex.guide || {}} onChange={(guide) => setEx((prev) => ({ ...prev, guide }))} notify={notify} />

      <div className="field">
        <div style={{ fontSize: 13, marginBottom: 6 }}>شکل (اختیاری)</div>
        {ex.figureUrl && (
          <div style={{ marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(ex.figureUrl)}
              alt="پیش‌نمایش شکل تمرین"
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
          {ex.figureUrl && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEx({ ...ex, figureUrl: undefined })}>
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
