"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // implicit flow: ハッシュからトークンを取得してセッションを確立
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => {
            window.history.replaceState(null, "", window.location.pathname);
          });
        return;
      }
    }
    supabase.auth.getSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage({ type: "error", text: "パスワードが一致しません" });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "パスワードは6文字以上で入力してください" });
      return;
    }
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: "error", text: "パスワードの更新に失敗しました。リンクが無効か期限切れの可能性があります。" });
    } else {
      setMessage({ type: "success", text: "パスワードを更新しました。ログインページに移動します..." });
      setTimeout(() => router.push("/auth"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f7f7f5" }}>
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ backgroundColor: "#1a1a2e" }}
          >
            <span className="text-white text-xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">新しいパスワードを設定</h1>
          <p className="text-sm text-gray-500 mt-1">6文字以上で入力してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#0f6e56]/40 focus:border-[#0f6e56]"
                placeholder="6文字以上"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード（確認）</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#0f6e56]/40 focus:border-[#0f6e56]"
                placeholder="もう一度入力"
              />
            </div>

            {message && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: loading ? "#888" : "#0f6e56" }}
            >
              {loading ? "更新中..." : "パスワードを更新"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
