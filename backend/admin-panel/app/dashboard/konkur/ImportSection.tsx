"use client";

import { useState } from "react";
import { importKonkur } from "@/lib/api";
import type { Notify } from "./types";

export default function ImportSection({ notify }: { notify: Notify }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
  }

  async function run() {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      notify("JSON نامعتبر است", "err");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      notify('ساختار باید {"tips":[],"questions":[]} باشد', "err");
      return;
    }
    const tips = Array.isArray(parsed.tips) ? parsed.tips : [];
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (tips.length + questions.length === 0) {
      notify("نه نکته‌ای پیدا شد نه سؤالی", "err");
      return;
    }
    if (!window.confirm(`${tips.length} نکته و ${questions.length} سؤال وارد (و در صورت وجود جایگزین) شود؟`)) return;
    setBusy(true);
    try {
      const res = await importKonkur({ tips, questions });
      setResult(JSON.stringify(res, null, 2));
      notify("وارد شد", "ok");
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>ورود از JSON</h2>
      <p className="card-desc">
        فایل خروجی یا JSON با ساختار {`{"tips":[...],"questions":[...]}`} را بچسبان؛ موارد وارد‌شده منتشرشده ذخیره می‌شوند و
        شناسه‌های تکراری جایگزین می‌شوند.
      </p>
      <input type="file" accept="application/json,.json" aria-label="فایل JSON" onChange={(e) => onFile(e.target.files?.[0])} />
      <textarea
        aria-label="JSON"
        className="mono"
        dir="ltr"
        rows={14}
        style={{ width: "100%", marginTop: 8, textAlign: "left" }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-sm" onClick={run} disabled={busy || !text.trim()}>
          {busy ? "..." : "ورود"}
        </button>
      </div>
      {result && (
        <pre className="mono" dir="ltr" style={{ textAlign: "left", marginTop: 8 }}>
          {result}
        </pre>
      )}
    </div>
  );
}
