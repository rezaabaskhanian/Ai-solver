"use client";

import { useState } from "react";
import TipsSection from "./konkur/TipsSection";
import QuestionsSection from "./konkur/QuestionsSection";
import PdfUploadSection from "./konkur/PdfUploadSection";
import DraftsSection from "./konkur/DraftsSection";
import ImportSection from "./konkur/ImportSection";
import SeedSection from "./konkur/SeedSection";
import ExamStatsSection from "./konkur/ExamStatsSection";
import ExercisesSection from "./konkur/ExercisesSection";

type SubTab = "tips" | "questions" | "exercises" | "pdf" | "drafts" | "import" | "exams";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "tips", label: "نکته‌ها" },
  { key: "questions", label: "سؤال‌ها" },
  { key: "exercises", label: "تمرین‌های کتاب" },
  { key: "pdf", label: "آپلود PDF" },
  { key: "drafts", label: "بازبینی پیش‌نویس‌ها" },
  { key: "import", label: "ورود از JSON" },
  { key: "exams", label: "نتایج آزمون‌ها" },
];

export default function KonkurPanel({
  notify,
}: {
  notify: (msg: string, type?: "ok" | "err") => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("tips");
  const [draftsKey, setDraftsKey] = useState(0);

  return (
    <div>
      <SeedSection notify={notify} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }} role="tablist">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={subTab === t.key}
            className={`tab-btn ${subTab === t.key ? "active" : ""}`}
            onClick={() => setSubTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "tips" && <TipsSection notify={notify} />}
      {subTab === "questions" && <QuestionsSection notify={notify} />}
      {subTab === "exercises" && <ExercisesSection notify={notify} />}
      {subTab === "pdf" && <PdfUploadSection notify={notify} onDraftsAdded={() => setDraftsKey((k) => k + 1)} />}
      {subTab === "drafts" && <DraftsSection notify={notify} reloadKey={draftsKey} />}
      {subTab === "import" && <ImportSection notify={notify} />}
      {subTab === "exams" && <ExamStatsSection notify={notify} />}
    </div>
  );
}
