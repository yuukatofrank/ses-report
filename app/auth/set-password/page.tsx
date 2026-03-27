"use client";

import { useState, useEffect, Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function SetPasswordForm() {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // PKCEフロー（codeパラメータあり）の場合はコード交換を試みる
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        // 失敗してもonAuthStateChangeで拾う
      });
    }

    // セッション確立を待つ（ハッシュトークン含む）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
        setInitializing(false);
      }
    });

    // 既存セッションも確認
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
        setInitializing(false);
      }
    });

    // 10秒待ってセッションが取れなければログインへ
    const timeout = setTimeout(() => {
      setInitializing((prev) => {
        if (prev) router.push("/auth?error=invalid_invite");
        return false;
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
      setMessage({ type: "error", text: `エラー: ${error.message}` });
    } else {
      setMessage({ type: "success", text: "パスワードを設定しました。月次報告システムへ移動します..." });
      setTimeout(() => router.push("/"), 2000);
    }
    setLoading(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f7f7f5" }}>
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">認証情報を確認中...</div>
          <div className="text-gray-300 text-xs">しばらくお待ちください</div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-gray-800">パスワードを設定</h1>
          <p className="text-sm text-gray-500 mt-1">アカウントを有効化するには、パスワードを設定してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {email && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">アカウント</p>
              <p className="text-sm text-gray-700 font-medium">{email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
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
              <div className={`text-sm rounded-lg px-3 py-2 ${
                message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: loading ? "#888" : "#0f6e56" }}
            >
              {loading ? "設定中..." : "パスワードを設定する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f7f7f5" }}>
        <div className="text-gray-500 text-sm">読み込み中...</div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
