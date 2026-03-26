"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Member } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth");
        return;
      }
      if (adminEmail && data.user.email !== adminEmail) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      fetchMembers();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    const res = await fetch("/api/members");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`「${member.name}」を削除しますか？\n月報・コメントを含む全データが削除されます。`)) return;
    setDeleting(member.id);
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchMembers();
      } else {
        alert("削除に失敗しました");
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePermission = async (member: Member) => {
    const newPermission = member.permission === "admin" ? "member" : "admin";
    const label = newPermission === "admin" ? "管理者" : "一般ユーザー";
    if (!confirm(`「${member.name}」の権限を「${label}」に変更しますか？`)) return;
    setUpdatingPermission(member.id);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newPermission }),
      });
      if (res.ok) {
        await fetchMembers();
      } else {
        alert("権限変更に失敗しました");
      }
    } finally {
      setUpdatingPermission(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <p className="text-gray-600 font-medium">アクセス権限がありません</p>
          <button onClick={() => router.push("/")} className="mt-4 text-[#0f6e56] hover:underline text-sm">
            ← トップへ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f7f5" }}>
      {/* ヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6"
        style={{ backgroundColor: "#1a1a2e", height: "56px" }}>
        <h1 className="text-white font-bold text-lg">管理画面 — ユーザー管理</h1>
        <button onClick={() => router.push("/")}
          className="text-white/70 hover:text-white text-sm border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
          ← 月報画面へ
        </button>
      </div>

      <div className="pt-[72px] max-w-3xl mx-auto px-4 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">
            登録ユーザー一覧 <span className="text-gray-400 font-normal">({members.length}人)</span>
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {members.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              登録ユーザーがいません
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800">{m.name}</span>
                      {m.role && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {m.role}
                        </span>
                      )}
                      {/* 権限バッジ */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.permission === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {m.permission === "admin" ? "管理者" : "一般"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {m.email || "メールアドレス未登録"}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      登録日: {new Date(m.created_at).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* 権限変更ボタン */}
                    <button
                      onClick={() => handleTogglePermission(m)}
                      disabled={updatingPermission === m.id}
                      className={`text-xs border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        m.permission === "admin"
                          ? "text-purple-500 hover:text-purple-700 border-purple-200 hover:border-purple-400"
                          : "text-gray-400 hover:text-purple-600 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {updatingPermission === m.id
                        ? "変更中..."
                        : m.permission === "admin" ? "一般に変更" : "管理者に変更"}
                    </button>
                    {/* 削除ボタン */}
                    <button
                      onClick={() => handleDelete(m)}
                      disabled={deleting === m.id}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400
                                 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === m.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          ユーザーを削除すると、月報・コメントを含むすべてのデータが削除されます
        </p>
      </div>
    </div>
  );
}
