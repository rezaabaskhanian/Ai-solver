"use client";

import { useRef, useState } from "react";
import { extractKonkurPage } from "@/lib/api";
import type { KonkurDraft } from "@/lib/types";
import type { Notify } from "./types";

// فقط سمت کلاینت و با import پویا بارگذاری می‌شود (pdfjs به DOM نیاز دارد).
type PdfJs = typeof import("pdfjs-dist");
type PdfDoc = import("pdfjs-dist").PDFDocumentProxy;

type PageState = { status: "idle" | "running" | "done" | "error"; message?: string; drafts?: number };

const MAX_WIDTH_PX = 1700;

async function loadPdfJs(useCdn = false): Promise<PdfJs> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = useCdn
    ? `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    : new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs;
}

async function openPdf(data: ArrayBuffer): Promise<PdfDoc> {
  // اول worker محلی؛ اگر بالا نیامد، CDN.
  try {
    const pdfjs = await loadPdfJs(false);
    return await pdfjs.getDocument({ data: data.slice(0) }).promise;
  } catch {
    const pdfjs = await loadPdfJs(true);
    return await pdfjs.getDocument({ data: data.slice(0) }).promise;
  }
}

async function renderPage(doc: PdfDoc, n: number): Promise<Blob> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, MAX_WIDTH_PX / base.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas در دسترس نیست");
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("تبدیل صفحه به تصویر ناموفق بود");
  return blob;
}

export default function PdfUploadSection({ notify, onDraftsAdded }: { notify: Notify; onDraftsAdded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [sourceName, setSourceName] = useState("");
  const [kind, setKind] = useState<"questions" | "tips">("questions");
  const [year, setYear] = useState("");
  const [track, setTrack] = useState("");
  const [round, setRound] = useState("");
  const [abroad, setAbroad] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [running, setRunning] = useState(false);
  const [pages, setPages] = useState<Record<number, PageState>>({});
  const [total, setTotal] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const docRef = useRef<PdfDoc | null>(null);
  const cancelRef = useRef(false);

  async function onPick(f: File | undefined) {
    docRef.current = null;
    setPages({});
    setNumPages(0);
    setDraftCount(0);
    setSkipped([]);
    setFile(f || null);
    if (!f) return;
    if (!sourceName) setSourceName(f.name.replace(/\.pdf$/i, ""));
    setLoadingPdf(true);
    try {
      const doc = await openPdf(await f.arrayBuffer());
      docRef.current = doc;
      setNumPages(doc.numPages);
      setFrom("1");
      setTo(String(doc.numPages));
    } catch (err: any) {
      notify(`خواندن PDF ناموفق بود: ${err?.message || err}`, "err");
      setFile(null);
    } finally {
      setLoadingPdf(false);
    }
  }

  function setPage(n: number, st: PageState) {
    setPages((p) => ({ ...p, [n]: st }));
  }

  async function processPage(n: number): Promise<boolean> {
    const doc = docRef.current;
    if (!doc) return false;
    setPage(n, { status: "running" });
    try {
      const blob = await renderPage(doc, n);
      const res = await extractKonkurPage(blob, {
        source_name: sourceName.trim(),
        kind,
        year: year || undefined,
        track: track || undefined,
        round: round || undefined,
        abroad: abroad || undefined,
        page_label: String(n),
      });
      setPage(n, { status: "done", drafts: res.drafts.length });
      setDraftCount((c) => c + res.drafts.length);
      if (res.skipped && res.skipped.length) {
        setSkipped((s) => [
          ...s,
          ...res.skipped!.map((x) => `صفحه ${n}: ${typeof x === "string" ? x : JSON.stringify(x)}`),
        ]);
      }
      return true;
    } catch (err: any) {
      setPage(n, { status: "error", message: err?.message || String(err) });
      return false;
    }
  }

  async function start() {
    const a = Math.max(1, Math.floor(Number(from) || 1));
    const b = Math.min(numPages, Math.floor(Number(to) || numPages));
    if (!sourceName.trim()) return notify("نام منبع را وارد کن", "err");
    if (a > b) return notify("بازه‌ی صفحه‌ها نامعتبر است", "err");
    cancelRef.current = false;
    setRunning(true);
    setTotal(b - a + 1);
    setPages({});
    setDraftCount(0);
    setSkipped([]);
    for (let n = a; n <= b; n++) {
      if (cancelRef.current) break;
      await processPage(n);
    }
    setRunning(false);
    onDraftsAdded?.();
  }

  async function retry(n: number) {
    setRunning(true);
    await processPage(n);
    setRunning(false);
    onDraftsAdded?.();
  }

  const entries = Object.entries(pages)
    .map(([k, v]) => [Number(k), v] as const)
    .sort((x, y) => x[0] - y[0]);
  const doneCount = entries.filter(([, v]) => v.status === "done" || v.status === "error").length;
  const failed = entries.filter(([, v]) => v.status === "error");
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="card">
      <h2>آپلود PDF</h2>
      <p className="card-desc">
        هر صفحه داخل مرورگر به تصویر تبدیل و جداگانه برای استخراج فرستاده می‌شود. نتیجه به‌صورت پیش‌نویس در بخش «بازبینی» می‌آید.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
        <label>
          فایل PDF
          <br />
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={running || loadingPdf}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </label>
        {loadingPdf && <span className="hint">در حال خواندن PDF...</span>}
        {file && numPages > 0 && <span className="hint">{numPages} صفحه</span>}

        <label>
          نام منبع
          <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} disabled={running} />
        </label>
        <label>
          نوع
          <select value={kind} onChange={(e) => setKind(e.target.value as "questions" | "tips")} disabled={running}>
            <option value="questions">سؤال</option>
            <option value="tips">نکته</option>
          </select>
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            سال{" "}
            <input type="number" style={{ width: 90 }} value={year} onChange={(e) => setYear(e.target.value)} disabled={running} />
          </label>
          <label>
            رشته{" "}
            <select value={track} onChange={(e) => setTrack(e.target.value)} disabled={running}>
              <option value="">—</option>
              <option value="riazi">ریاضی</option>
              <option value="tajrobi">تجربی</option>
            </select>
          </label>
          <label>
            نوبت{" "}
            <select value={round} onChange={(e) => setRound(e.target.value)} disabled={running}>
              <option value="">—</option>
              <option value="1">اول</option>
              <option value="2">دوم</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={abroad} onChange={(e) => setAbroad(e.target.checked)} disabled={running} /> خارج از کشور
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>
            از صفحه{" "}
            <input
              type="number"
              min={1}
              max={numPages || undefined}
              style={{ width: 80 }}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={running}
            />
          </label>
          <label>
            تا صفحه{" "}
            <input
              type="number"
              min={1}
              max={numPages || undefined}
              style={{ width: 80 }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={running}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={start} disabled={running || !file || numPages === 0}>
            {running ? "در حال پردازش..." : "شروع استخراج"}
          </button>
          {running && (
            <button className="btn btn-ghost btn-sm" onClick={() => (cancelRef.current = true)}>
              توقف
            </button>
          )}
        </div>
      </div>

      {total > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="پیشرفت استخراج"
            style={{ height: 10, background: "rgba(127,127,127,0.2)", borderRadius: 999, overflow: "hidden" }}
          >
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", transition: "width .2s" }} />
          </div>
          <p className="hint">
            {doneCount} از {total} صفحه · {draftCount} پیش‌نویس ساخته شد
            {failed.length > 0 ? ` · ${failed.length} صفحه با خطا` : ""}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
            {entries.map(([n, st]) => (
              <li key={n} style={{ display: "flex", gap: 8, alignItems: "center", padding: "2px 0" }}>
                <span>صفحه {n}:</span>
                {st.status === "running" && <span className="pill warn">در حال پردازش</span>}
                {st.status === "done" && <span className="pill ok">{st.drafts} پیش‌نویس</span>}
                {st.status === "error" && (
                  <>
                    <span className="pill err">خطا</span>
                    <span style={{ opacity: 0.8 }}>{st.message}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => retry(n)} disabled={running}>
                      تلاش مجدد
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {skipped.length > 0 && (
            <div className="warn-box">
              <strong>موارد ردشده:</strong>
              <ul style={{ margin: "4px 0 0", paddingInlineStart: 18 }}>
                {skipped.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
