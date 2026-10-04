"use client";

import type { KonkurLine } from "@/lib/types";

// ویرایشگر خط‌های متن/ریاضی. خط ریاضی در جعبه‌ی تک‌فاصله و چپ‌به‌راست نمایش داده می‌شود.
export default function LinesEditor({
  label,
  lines,
  onChange,
}: {
  label: string;
  lines: KonkurLine[];
  onChange: (lines: KonkurLine[]) => void;
}) {
  function setLine(i: number, line: KonkurLine) {
    onChange(lines.map((l, idx) => (idx === i ? line : l)));
  }
  function remove(i: number) {
    onChange(lines.filter((_, idx) => idx !== i));
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <fieldset className="field" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
      <legend style={{ fontSize: 13, padding: "0 6px" }}>{label}</legend>
      {lines.length === 0 && <p className="hint">خطی وجود ندارد.</p>}
      {lines.map((line, i) => {
        const isMath = typeof line !== "string";
        const value = typeof line === "string" ? line : line.math;
        return (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
            <label style={{ fontSize: 12, whiteSpace: "nowrap", paddingTop: 8 }}>
              <input
                type="checkbox"
                checked={isMath}
                onChange={(e) => setLine(i, e.target.checked ? { math: value } : value)}
              />{" "}
              ریاضی
            </label>
            <textarea
              aria-label={`${label} - خط ${i + 1}`}
              rows={isMath ? 1 : 2}
              className={isMath ? "mono" : undefined}
              dir={isMath ? "ltr" : "rtl"}
              style={{ flex: 1, minWidth: 0, ...(isMath ? { textAlign: "left" } : {}) }}
              value={value}
              onChange={(e) => setLine(i, isMath ? { math: e.target.value } : e.target.value)}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label="بالا" disabled={i === 0}>
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => move(i, 1)}
              aria-label="پایین"
              disabled={i === lines.length - 1}
            >
              ↓
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)} aria-label="حذف خط">
              ✕
            </button>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...lines, ""])}>
          + خط متن
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...lines, { math: "" }])}>
          + خط ریاضی
        </button>
      </div>
    </fieldset>
  );
}

// پیش‌نمایش ساده‌ی یک خط (برای لیست‌ها)
export function LinePreview({ line }: { line: KonkurLine }) {
  if (typeof line === "string") return <p style={{ margin: "2px 0", fontSize: 13 }}>{line}</p>;
  return (
    <div
      className="mono"
      dir="ltr"
      style={{ margin: "2px 0", padding: "4px 8px", background: "rgba(127,127,127,0.12)", borderRadius: 6, textAlign: "left" }}
    >
      {line.math}
    </div>
  );
}
