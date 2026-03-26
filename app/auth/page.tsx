"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: "メールアドレスまたはパスワードが正しくありません" });
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (error.message.includes("already registered")) {
          setMessage({ type: "error", text: "このメールアドレスはすでに登録されています" });
        } else {
          setMessage({ type: "error", text: error.message });
        }
      } else {
        setMessage({
          type: "success",
          text: "確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。",
        });
        setEmail("");
        setPassword("");
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#f7f7f5" }}
    >
      <div className="w-full max-w-sm mx-4">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ backgroundColor: "#1a1a2e" }}
          >
            <span className="text-white text-xl">📋</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">SES月次報告システム</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "login" ? "アカウントにログイン" : "新規アカウント作成"}
          </p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#0f6e56]/40 focus:border-[#0f6e56]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
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

            {message && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  message.type === "error"
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-700"
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
              {loading
                ? "処理中..."
                : mode === "login"
                ? "ログイン"
                : "アカウント作成"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage(null);
              }}
              className="text-sm text-[#0f6e56] hover:underline"
            >
              {mode === "login"
                ? "アカウントをお持ちでない方はこちら"
                : "すでにアカウントをお持ちの方はこちら"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
