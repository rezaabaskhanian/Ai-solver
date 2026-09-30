"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";
import AIPanel from "./AIPanel";
import ProxyPanel from "./ProxyPanel";
import QuotaPanel from "./QuotaPanel";
import SubscriptionPanel from "./SubscriptionPanel";
import LandingPanel from "./LandingPanel";

type Tab = "ai" | "quota" | "subscriptions" | "landing" | "proxy";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("ai");

  // توست ساده
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  function notify(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // نگهبان احراز هویت
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  if (!ready) {
    return <div className="center-screen">در حال بررسی دسترسی...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="sidebar-title">پنل ادمین MathMotion</h1>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${tab === "ai" ? "active" : ""}`} onClick={() => setTab("ai")}>
            هوش مصنوعی
          </button>
          <button className={`sidebar-link ${tab === "quota" ? "active" : ""}`} onClick={() => setTab("quota")}>
            سهمیه و محدودیت‌ها
          </button>
          <button
            className={`sidebar-link ${tab === "subscriptions" ? "active" : ""}`}
            onClick={() => setTab("subscriptions")}
          >
            اشتراک‌ها
          </button>
          <button className={`sidebar-link ${tab === "landing" ? "active" : ""}`} onClick={() => setTab("landing")}>
            صفحه‌ی معرفی (سایت)
          </button>
          <button className={`sidebar-link ${tab === "proxy" ? "active" : ""}`} onClick={() => setTab("proxy")}>
            پراکسی Xray
          </button>
        </nav>
        <div className="sidebar-foot">
          <span className="userbox">ادمین</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            خروج
          </button>
        </div>
      </aside>

      <main className="container">
        {tab === "ai" && <AIPanel notify={notify} />}
        {tab === "quota" && <QuotaPanel notify={notify} />}
        {tab === "subscriptions" && <SubscriptionPanel notify={notify} />}
        {tab === "landing" && <LandingPanel notify={notify} />}
        {tab === "proxy" && <ProxyPanel notify={notify} />}
      </main>

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
