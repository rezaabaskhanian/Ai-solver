"use client";

import { useEffect, useState } from "react";
import { createKonkurTip, deleteKonkurTip, listKonkurTips, updateKonkurTip } from "@/lib/api";
import type { KonkurTip } from "@/lib/types";
import { GRADES } from "./TipForm";
import TipForm, { emptyTip } from "./TipForm";
import { LinePreview } from "./LinesEditor";
import type { Notify } from "./types";

export default function TipsSection({ notify }: { notify: Notify }) {
  const [tips, setTips] = useState<KonkurTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState("");
  // null = فرم بسته، "new" = افزودن، وگرنه شناسه‌ی نکته‌ی در حال ویرایش
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTips(await listKonkurTips());
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

  async function handleSubmit(tip: KonkurTip) {
    setSaving(true);
    try {
      if (editing === "new") await createKonkurTip(tip);
      else await updateKonkurTip(editing as string, tip);
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
    if (!window.confirm(`نکته‌ی «${id}» حذف شود؟`)) return;
    try {
      await deleteKonkurTip(id);
      notify("حذف شد", "ok");
      if (editing === id) setEditing(null);
      load();
    } catch (err: any) {
      notify(err.message, "err");
    }
  }

  const shown = tips.filter((t) =>
    gradeFilter === "" ? true : gradeFilter === "general" ? t.grade === null : String(t.grade) === gradeFilter
  );
  const editingTip = editing && editing !== "new" ? tips.find((t) => t.id === editing) : undefined;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          پایه:{" "}
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="">همه</option>
            <option value="general">عمومی</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm" onClick={() => setEditing("new")}>
          + نکته‌ی جدید
        </button>
      </div>

      {editing && (editing === "new" || editingTip) && (
        <div className="card" style={{ borderColor: "var(--primary)" }}>
          <h2 style={{ marginTop: 0 }}>{editing === "new" ? "افزودن نکته" : "ویرایش نکته"}</h2>
          <TipForm
            key={editing}
            initial={editingTip || emptyTip}
            isEdit={editing !== "new"}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {loading ? (
        <p className="hint">در حال بارگذاری...</p>
      ) : shown.length === 0 ? (
        <p className="hint">نکته‌ای وجود ندارد.</p>
      ) : (
        shown.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0 }}>
                  {t.title}{" "}
                  <span className="pill">{t.grade === null ? "عمومی" : `پایه‌ی ${t.grade}`}</span>
                </h3>
                <div className="mono" dir="ltr" style={{ opacity: 0.6, textAlign: "right" }}>
                  {t.id}
                  {t.chapterId ? ` · ${t.chapterId}` : ""}
                </div>
                <div style={{ marginTop: 6 }}>
                  {t.body.map((l, i) => (
                    <LinePreview key={i} line={l} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(t.id)}>
                  ویرایش
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)}>
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
