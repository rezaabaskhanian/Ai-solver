"use client";

import { useEffect, useState } from "react";
import { getKonkurExamStats, type KonkurExamStatRow } from "@/lib/api";
import type { Notify } from "./types";

export default function ExamStatsSection({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<KonkurExamStatRow[] | null>(null);

  useEffect(() => {
    getKonkurExamStats()
      .then(setRows)
      .catch((err: any) => notify(err.message, "err"));
    // notify may change identity every render; load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <h2>نتایج آزمون‌ها</h2>
      <p className="card-desc">
        بهترین نتیجه‌ی هر کاربر در آزمون‌های کامل کنکور. درصد شرکت‌کننده‌ها فقط وقتی به کاربر نشان داده می‌شود که حداقل ۲۰ نفر شرکت کرده باشند.
      </p>
      {rows === null ? (
        <p>در حال بارگذاری…</p>
      ) : rows.length === 0 ? (
        <p>هنوز نتیجه‌ای ثبت نشده است.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>آزمون</th>
              <th>شرکت‌کننده</th>
              <th>میانگین درصد</th>
              <th>بالاترین درصد</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.paper_key}>
                <td dir="ltr">{r.paper_key}</td>
                <td>{r.count}</td>
                <td>{r.average_percent.toFixed(1)}</td>
                <td>{r.best_percent.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
