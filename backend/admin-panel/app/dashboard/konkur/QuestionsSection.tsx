"use client";

import { useEffect, useState } from "react";
import {
  assetUrl,
  createKonkurQuestion,
  deleteKonkurQuestion,
  listKonkurQuestions,
  listKonkurTips,
  updateKonkurQuestion,
} from "@/lib/api";
import type { KonkurQuestion, KonkurQuestionFilters, KonkurTip } from "@/lib/types";
import QuestionForm, { emptyQuestion } from "./QuestionForm";
import type { Notify } from "./types";

export default function QuestionsSection({ notify }: { notify: Notify }) {
  const [questions, setQuestions] = useState<KonkurQuestion[]>([]);
  const [tips, setTips] = useState<KonkurTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<KonkurQuestionFilters>({ year: "", track: "", tipId: "", q: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(f: KonkurQuestionFilters = filters) {
    setLoading(true);
    try {
      setQuestions(await listKonkurQuestions(f));
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    listKonkurTips()
      .then(setTips)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(q: KonkurQuestion) {
    setSaving(true);
    try {
      if (editing === "new") await createKonkurQuestion(q);
      else await updateKonkurQuestion(editing as string, q);
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
    if (!window.confirm(`سؤال «${id}» حذف شود؟`)) return;
    try {
      await deleteKonkurQuestion(id);
      notify("حذف شد", "ok");
      if (editing === id) setEditing(null);
      load();
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  const editingQ = editing && editing !== "new" ? questions.find((q) => q.id === editing) : undefined;

  return (
    <div>
      <form
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          type="number"
          aria-label="سال"
          placeholder="سال"
          style={{ width: 90 }}
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
        />
        <select aria-label="رشته" value={filters.track} onChange={(e) => setFilters({ ...filters, track: e.target.value })}>
          <option value="">همه‌ی رشته‌ها</option>
          <option value="riazi">ریاضی</option>
          <option value="tajrobi">تجربی</option>
        </select>
        <select aria-label="نکته" value={filters.tipId} onChange={(e) => setFilters({ ...filters, tipId: e.target.value })}>
          <option value="">همه‌ی نکته‌ها</option>
          {tips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
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
          + سؤال جدید
        </button>
      </form>

      {editing && (editing === "new" || editingQ) && (
        <div className="card" style={{ borderColor: "var(--primary)" }}>
          <h2 style={{ marginTop: 0 }}>{editing === "new" ? "افزودن سؤال" : "ویرایش سؤال"}</h2>
          <QuestionForm
            key={editing}
            initial={editingQ || emptyQuestion}
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
      ) : questions.length === 0 ? (
        <p className="hint">سؤالی وجود ندارد.</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="mono" dir="ltr" style={{ opacity: 0.6, textAlign: "right" }}>
                  {q.id} ·{" "}
                  {q.source.kind === "konkur"
                    ? `${q.source.year} ${q.source.track}${q.source.number ? ` #${q.source.number}` : ""}`
                    : "authored"}
                </div>
                <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{q.text}</p>
                {q.expression && (
                  <div className="mono" dir="ltr" style={{ textAlign: "left", background: "rgba(127,127,127,0.12)", padding: "4px 8px", borderRadius: 6 }}>
                    {q.expression}
                  </div>
                )}
                {q.figureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(q.figureUrl)} alt="شکل سؤال" style={{ maxWidth: 200, maxHeight: 140, marginTop: 6 }} />
                )}
                <ol className="mono" dir="ltr" style={{ textAlign: "left", margin: "6px 0", paddingLeft: 20 }}>
                  {q.choices.map((c, i) => (
                    <li key={i} style={{ fontWeight: q.answer === i ? 700 : 400, color: q.answer === i ? "var(--primary)" : undefined }}>
                      {c}
                    </li>
                  ))}
                </ol>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(q.id)}>
                  ویرایش
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(q.id)}>
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
