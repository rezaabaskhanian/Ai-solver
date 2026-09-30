"use client";

import { useState } from "react";
import LandingSettingsForm from "./landing/LandingSettingsForm";
import LandingHighlightsList from "./landing/LandingHighlightsList";
import LandingSectionsList from "./landing/LandingSectionsList";
import LandingFAQsList from "./landing/LandingFAQsList";

type SubTab = "settings" | "features" | "steps" | "sections" | "faqs";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "settings", label: "تنظیمات کلی" },
  { key: "features", label: "چرا MathMotion" },
  { key: "steps", label: "چطور کار می‌کنه" },
  { key: "sections", label: "بخش‌های تکمیلی" },
  { key: "faqs", label: "سوالات متداول" },
];

export default function LandingPanel({
  notify,
}: {
  notify: (msg: string, type?: "ok" | "err") => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>("settings");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${subTab === t.key ? "active" : ""}`}
            onClick={() => setSubTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "settings" && <LandingSettingsForm notify={notify} />}
      {subTab === "features" && (
        <LandingHighlightsList
          kind="feature"
          title="چرا MathMotion"
          hint="نوار ۳ فیچر کوتاه که بالای صفحه، زیر هیرو نمایش داده می‌شود (مثلاً: اسکن با دوربین، قدم‌به‌قدم مثل کتاب درسی، جواب تأییدشده)."
          notify={notify}
        />
      )}
      {subTab === "steps" && (
        <LandingHighlightsList
          kind="step"
          title="چطور کار می‌کنه"
          hint="کارت‌های شماره‌دار «چطور کار می‌کنه» (مثلاً: مسئله رو بده → راه‌حل رو ببین → تمرین کن)."
          notify={notify}
        />
      )}
      {subTab === "sections" && <LandingSectionsList notify={notify} />}
      {subTab === "faqs" && <LandingFAQsList notify={notify} />}
    </div>
  );
}
