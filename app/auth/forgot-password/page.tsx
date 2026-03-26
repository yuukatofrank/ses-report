"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const supabase = createSupabaseBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setMessage({ type: "error", text: "送信に失敗しました。メールアドレスを確認してください。" });
    } else {
      setMessage({
        type: "success",
        text: "パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。",
      });
      setEmail("");
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
            <span className="text-white text-xl">🔑</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">パスワードをお忘れですか？</h1>
          <p className="text-sm text-gray-500 mt-1">
            登録したメールアドレスにリセットリンクを送信します
          </p>
        </div>

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
              {loading ? "送信中..." : "リセットリンクを送信"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth" className="text-sm text-[#0f6e56] hover:underline">
              ← ログインに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
