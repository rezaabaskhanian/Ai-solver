"use client";

import { useEffect, useState } from "react";
import {
  assetUrl,
  createTextbookExercise,
  deleteTextbookExercise,
  listTextbookExercises,
  updateTextbookExercise,
} from "@/lib/api";
import { TEXTBOOKS, findBook } from "@/lib/textbooks";
import type { TextbookExercise, TextbookExerciseFilters } from "@/lib/types";
import ExerciseForm, { SECTION_LABELS, emptyExercise } from "./ExerciseForm";
import { LinePreview } from "./LinesEditor";
import type { Notify } from "./types";

// «تمرین‌های کتاب»: صورت تمرین عین کتاب درسی، راه‌حل نوشته‌ی خودمان.
export default function ExercisesSection({ notify }: { notify: Notify }) {
  const [exercises, setExercises] = useState<TextbookExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TextbookExerciseFilters>({ bookId: "math9", chapterId: "", q: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const book = findBook(filters.bookId || "");

  async function load(f: TextbookExerciseFilters = filters) {
    setLoading(true);
    try {
      setExercises(await listTextbookExercises(f));
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: TextbookExercise) {
    setSaving(true);
    try {
      if (editing === "new") await createTextbookExercise(e);
      else await updateTextbookExercise(editing as string, e);
      notify("ذخیره شد", "ok");
      setEditing(null);
      load();
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(`تمرین «${id}» حذف شود؟`)) return;
    try {
      await deleteTextbookExercise(id);
      notify("حذف شد", "ok");
      if (editing === id) setEditing(null);
      load();
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  const editingEx = editing && editing !== "new" ? exercises.find((e) => e.id === editing) : undefined;
  const chapterTitle = (bookId: string, chapterId: string) => {
    const b = findBook(bookId);
    const i = b?.chapters.findIndex((c) => c.id === chapterId) ?? -1;
    return b && i >= 0 ? `${b.title} · فصل ${i + 1}: ${b.chapters[i].title}` : `${bookId} · ${chapterId}`;
  };

  return (
    <div>
      <form
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <select
          aria-label="کتاب"
          value={filters.bookId}
          onChange={(e) => setFilters({ ...filters, bookId: e.target.value, chapterId: "" })}
        >
          <option value="">همه‌ی کتاب‌ها</option>
          {TEXTBOOKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <select
          aria-label="فصل"
          value={filters.chapterId}
          disabled={!book}
          onChange={(e) => setFilters({ ...filters, chapterId: e.target.value })}
        >
          <option value="">همه‌ی فصل‌ها</option>
          {book?.chapters.map((c, i) => (
            <option key={c.id} value={c.id}>
              فصل {i + 1}: {c.title}
            </option>
          ))}
        </select>
        <input
          aria-label="جستجو"
          placeholder="جستجو در متن"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <button type="submit" className="btn btn-sm">
          اعمال فیلتر
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing("new")}>
          + تمرین جدید
        </button>
        <span className="hint">{exercises.length} تمرین</span>
      </form>
      <p className="hint" style={{ marginTop: 0 }}>
        برای افزودن سریع، صفحه‌های کتاب را در «آپلود PDF» با نوع «تمرین کتاب» بفرست؛ هوش مصنوعی صورت و یک راه‌حل پیشنهادی
        می‌سازد و در «بازبینی پیش‌نویس‌ها» قبل از انتشار بررسی‌شان می‌کنی.
      </p>

      {editing && (editing === "new" || editingEx) && (
        <div className="card" style={{ borderColor: "var(--primary)" }}>
          <h2 style={{ marginTop: 0 }}>{editing === "new" ? "افزودن تمرین" : "ویرایش تمرین"}</h2>
          <ExerciseForm
            key={editing}
            initial={
              editingEx ||
              { ...emptyExercise, bookId: filters.bookId || emptyExercise.bookId, chapterId: filters.chapterId || "" }
            }
            isEdit={editing !== "new"}
            saving={saving}
            notify={notify}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {loading ? (
        <p className="hint">در حال بارگذاری...</p>
      ) : exercises.length === 0 ? (
        <p className="hint">تمرینی وجود ندارد.</p>
      ) : (
        exercises.map((ex, idx) => {
          const prev = exercises[idx - 1];
          const newChapter = !prev || prev.chapterId !== ex.chapterId || prev.bookId !== ex.bookId;
          return (
            <div key={ex.id}>
              {newChapter && <h3 style={{ margin: "16px 0 8px" }}>{chapterTitle(ex.bookId, ex.chapterId)}</h3>}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="pill">{SECTION_LABELS[ex.section] || ex.section}</span>
                      <span className="pill">
                        صفحه {ex.page} · شماره {ex.number}
                        {ex.lesson ? ` · درس ${ex.lesson}` : ""}
                      </span>
                      {ex.free && <span className="pill ok">رایگان</span>}
                      <span className="mono" dir="ltr" style={{ opacity: 0.6 }}>
                        {ex.id}
                      </span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {ex.text.slice(0, 3).map((l, i) => (
                        <LinePreview key={i} line={l} />
                      ))}
                      {ex.parts && ex.parts.length > 0 && (
                        <p className="hint" style={{ margin: "4px 0" }}>
                          {ex.parts.length} قسمت: {ex.parts.map((p) => p.label).join("، ")}
                        </p>
                      )}
                    </div>
                    {ex.figureUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(ex.figureUrl)} alt="شکل تمرین" style={{ maxWidth: 200, maxHeight: 140, marginTop: 6 }} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(ex.id)}>
                      ویرایش
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(ex.id)}>
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
