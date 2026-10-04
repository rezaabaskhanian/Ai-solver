"use client";

import { useEffect, useState } from "react";
import { approveKonkurDraft, deleteKonkurDraft, listKonkurDrafts, updateKonkurDraft } from "@/lib/api";
import type { KonkurDraft, KonkurQuestion, KonkurTip } from "@/lib/types";
import QuestionForm, { normalizeQuestion } from "./QuestionForm";
import TipForm, { normalizeTip } from "./TipForm";
import type { Notify } from "./types";

export default function DraftsSection({ notify, reloadKey }: { notify: Notify; reloadKey?: number }) {
  const [drafts, setDrafts] = useState<KonkurDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setDrafts(await listKonkurDrafts("pending"));
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  function setError(id: string, msg: string | null) {
    setErrors((e) => {
      const n = { ...e };
      if (msg) n[id] = msg;
      else delete n[id];
      return n;
    });
  }

  function removeLocal(id: string) {
    setDrafts((d) => d.filter((x) => x.id !== id));
    setError(id, null);
  }

  async function save(d: KonkurDraft, data: Record<string, unknown>, silent = false): Promise<boolean> {
    setBusyId(d.id);
    try {
      await updateKonkurDraft(d.id, data);
      setDrafts((all) => all.map((x) => (x.id === d.id ? { ...x, data } : x)));
      if (!silent) notify("ذخیره شد", "ok");
      return true;
    } catch (err: any) {
      setError(d.id, err.message);
      notify(err.message, "err");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function approve(d: KonkurDraft, data: Record<string, unknown> | null, overwrite = false) {
    if (data && !(await save(d, data, true))) return;
    setBusyId(d.id);
    try {
      await approveKonkurDraft(d.id, overwrite);
      notify("تأیید و منتشر شد", "ok");
      removeLocal(d.id);
    } catch (err: any) {
      // ۴۲۲: نامعتبر یا تکراری؛ پیام سرور کنار کارت نشان داده می‌شود.
      setError(d.id, err.message);
      notify(err.message, "err");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(d: KonkurDraft) {
    if (!window.confirm("این پیش‌نویس رد (حذف) شود؟")) return;
    setBusyId(d.id);
    try {
      await deleteKonkurDraft(d.id);
      removeLocal(d.id);
      notify("رد شد", "ok");
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setBusyId(null);
    }
  }

  async function approveAll() {
    if (!window.confirm(`تلاش برای تأیید ${drafts.length} پیش‌نویس؟ موارد نامعتبر باقی می‌مانند.`)) return;
    setBulkBusy(true);
    let ok = 0;
    let bad = 0;
    const approved: string[] = [];
    for (const d of drafts) {
      try {
        await approveKonkurDraft(d.id, false);
        approved.push(d.id);
        ok++;
      } catch (err: any) {
        bad++;
        setError(d.id, err.message);
      }
    }
    setDrafts((all) => all.filter((x) => !approved.includes(x.id)));
    setBulkBusy(false);
    notify(`${ok} مورد تأیید شد، ${bad} مورد ناموفق`, bad ? "err" : "ok");
  }

  const groups = new Map<string, KonkurDraft[]>();
  for (const d of drafts) {
    const k = d.source_name || "(بدون منبع)";
    groups.set(k, [...(groups.get(k) || []), d]);
  }

  if (loading) return <p className="hint">در حال بارگذاری...</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={approveAll} disabled={bulkBusy || drafts.length === 0}>
          {bulkBusy ? "در حال تأیید..." : "تأیید همه‌ی معتبرها"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={bulkBusy}>
          بازخوانی
        </button>
        <span className="hint">{drafts.length} پیش‌نویس در انتظار</span>
      </div>

      {drafts.length === 0 && <p className="hint">پیش‌نویسی در انتظار بازبینی نیست.</p>}

      {Array.from(groups.entries()).map(([source, list]) => (
        <section key={source} aria-label={`منبع ${source}`}>
          <h3>
            {source} <span className="pill">{list.length}</span>
          </h3>
          {list.map((d) => (
            <div key={d.id} className="card" style={{ borderColor: errors[d.id] ? "#dc2626" : undefined }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span className="pill">{d.kind === "question" ? "سؤال" : "نکته"}</span>
                <span className="mono" dir="ltr">{d.id}</span>
              </div>
              {d.warnings && d.warnings.length > 0 && (
                <div className="warn-box" role="alert" style={{ marginBottom: 10 }}>
                  <strong>هشدارها:</strong>
                  <ul style={{ margin: "4px 0 0", paddingInlineStart: 18 }}>
                    {d.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {errors[d.id] && (
                <div className="warn-box" role="alert" style={{ marginBottom: 10, background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.4)", color: "#991b1b" }}>
                  {errors[d.id]}
                  <div style={{ marginTop: 6 }}>
                    <button className="btn btn-ghost btn-sm" disabled={busyId === d.id} onClick={() => approve(d, null, true)}>
                      تأیید با جایگزینی (overwrite)
                    </button>
                  </div>
                </div>
              )}
              {d.kind === "question" ? (
                <QuestionForm
                  initial={normalizeQuestion(d.data)}
                  saving={busyId === d.id}
                  notify={notify}
                  lenient
                  submitLabel="ذخیره"
                  onSubmit={(q: KonkurQuestion) => save(d, q as unknown as Record<string, unknown>)}
                  onApprove={(q: KonkurQuestion) => approve(d, q as unknown as Record<string, unknown>)}
                  extraActions={
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => reject(d)} disabled={busyId === d.id}>
                      رد
                    </button>
                  }
                />
              ) : (
                <TipForm
                  initial={normalizeTip(d.data)}
                  saving={busyId === d.id}
                  lenient
                  submitLabel="ذخیره"
                  onSubmit={(t: KonkurTip) => save(d, t as unknown as Record<string, unknown>)}
                  onApprove={(t: KonkurTip) => approve(d, t as unknown as Record<string, unknown>)}
                  extraActions={
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => reject(d)} disabled={busyId === d.id}>
                      رد
                    </button>
                  }
                />
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
