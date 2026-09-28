"use client";

import { useEffect, useState } from "react";
import { connectProxy, getProxyStatus } from "@/lib/api";
import type { ProxyStatus } from "@/lib/types";

type Notify = (msg: string, type?: "ok" | "err") => void;

export default function ProxyPanel({ notify }: { notify: Notify }) {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<ProxyStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      const s = await getProxyStatus();
      setStatus(s);
      if (s.link) setLink((current) => current || s.link || "");
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    const value = link.trim();
    if (!value.startsWith("vless://")) {
      notify("لینک باید با vless:// شروع شود", "err");
      return;
    }
    setConnecting(true);
    try {
      const s = await connectProxy(value);
      setStatus({ ...s, link: value });
      notify(s.connected ? "به پراکسی وصل شد" : "اتصال برقرار نشد، جزئیات پایین کارت را ببین", s.connected ? "ok" : "err");
    } catch (err: any) {
      notify(err.message, "err");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ borderColor: "var(--primary)" }}>
        <h2>اتصال پراکسی خروجی (Xray / VLESS+Reality)</h2>
        <p className="card-desc">
          اگر IP سرور برای Claude، OpenRouter یا DeepSeek بلاک باشد، همه‌ی درخواست‌های هوش مصنوعی از این تونل رد
          می‌شوند. لینک <code>vless://...</code> را بچسبان و «اتصال» را بزن. چند ثانیه طول می‌کشد تا Xray ری‌لود شود
          و اتصال واقعی تست شود.
        </p>
        <div className="field-row" style={{ flexWrap: "wrap" }}>
          <input
            dir="ltr"
            className="mono"
            placeholder="vless://uuid@host:443?security=reality&..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            style={{ minWidth: 240 }}
          />
          <button className="btn btn-sm" onClick={connect} disabled={connecting}>
            {connecting ? "در حال اتصال..." : "اتصال"}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={checkStatus} disabled={checking}>
            {checking ? "..." : "تست وضعیت"}
          </button>
        </div>

        {status && (
          <p className="status-line">
            {status.connected ? (
              <span className="pill ok">
                وصل: IP {status.ip}
                {status.country ? ` (${status.country}${status.org ? `، ${status.org}` : ""})` : ""}
              </span>
            ) : (
              <span className="pill err">وصل نیست: {status.error || "خطای نامشخص"}</span>
            )}
          </p>
        )}

        {status && !status.via_proxy && (
          <div className="warn-box">
            <code>AI_OUTBOUND_PROXY</code> روی سرور تنظیم نشده، پس IP بالا IP خودِ سرور است و درخواست‌های هوش مصنوعی
            مستقیم می‌روند. در <code>docker-compose.prod.yaml</code> این مقدار روی <code>socks5://xray:1080</code> است.
          </div>
        )}
      </div>

      <div className="card">
        <h2>راهنما</h2>
        <p className="card-desc" style={{ marginBottom: 0 }}>
          راه‌اندازی خودِ سرور Xray (VPS، نصب xray-core، ساخت کلید Reality) دستی است. مراحل کامل در{" "}
          <code>backend/docs/xray-proxy-setup.md</code> است.
        </p>
      </div>
    </div>
  );
}
