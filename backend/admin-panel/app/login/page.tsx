"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken, verifyToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = token.trim();
    if (!value) {
      setError("توکن را وارد کن.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyToken(value);
      saveToken(value);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "خطا در ورود");
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>پنل ادمین MathMotion</h1>
        <p>با توکن ادمین سرور وارد شو</p>

        <label htmlFor="token">توکن ادمین (ADMIN_TOKEN)</label>
        <input
          id="token"
          type="password"
          placeholder="••••••••"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          dir="ltr"
          autoComplete="current-password"
        />

        <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={loading}>
          {loading ? "در حال بررسی..." : "ورود"}
        </button>

        {error && <div className="error-msg">{error}</div>}

        <div className="hint-box">
          همان مقداری که در <code>.env</code> بک‌اند برای <code>ADMIN_TOKEN</code> گذاشتی.
        </div>
      </form>
    </div>
  );
}
