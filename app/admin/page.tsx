"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Member } from "@/types";

type AdminUser = {
  auth_id: string;
  email: string;
  invited_at: string;
  confirmed: boolean;
  member_id: string | null;
  name: string | null;
  role: string | null;
  permission: "admin" | "member" | null;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);

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
      fetchUsers();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), redirectTo: window.location.origin }),
      });
      if (res.ok) {
        setInviteResult({ type: "success", text: `${inviteEmail} に招待メールを送信しました` });
        setInviteEmail("");
        await fetchUsers();
      } else {
        const err = await res.json();
        setInviteResult({ type: "error", text: err.error || "送信に失敗しました" });
      }
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (email: string) => {
    setResending(email);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: window.location.origin }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "再送に失敗しました");
      }
    } finally {
      setResending(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const label = user.name ?? user.email;
    if (!confirm(`「${label}」を削除しますか？\n月報・コメントを含む全データが削除されます。`)) return;
    setDeleting(user.auth_id);
    try {
      if (user.member_id) {
        // membersテーブルから削除（cascadeでauth.usersも消える想定）
        const res = await fetch(`/api/members/${user.member_id}`, { method: "DELETE" });
        if (!res.ok) { alert("削除に失敗しました"); return; }
      } else {
        // 招待中ユーザー（membersに未登録）→ auth.usersから直接削除
        const res = await fetch(`/api/admin/users/${user.auth_id}`, { method: "DELETE" });
        if (!res.ok) { alert("削除に失敗しました"); return; }
      }
      await fetchUsers();
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePermission = async (user: AdminUser) => {
    if (!user.member_id) return;
    const newPermission = user.permission === "admin" ? "member" : "admin";
    const label = newPermission === "admin" ? "管理者" : "一般ユーザー";
    if (!confirm(`「${user.name}」の権限を「${label}」に変更しますか？`)) return;
    setUpdatingPermission(user.auth_id);
    try {
      const res = await fetch(`/api/members/${user.member_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newPermission }),
      });
      if (res.ok) {
        await fetchUsers();
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

  const activeUsers = users.filter((u) => u.confirmed && u.member_id);
  const invitedUsers = users.filter((u) => !u.confirmed);

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
        {/* 招待フォーム */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">ユーザーを招待する</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteResult(null); }}
              placeholder="メールアドレスを入力"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#0f6e56]/40 focus:border-[#0f6e56]"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
              className="bg-[#0f6e56] text-white px-4 py-2 rounded-lg text-sm font-medium
                         hover:bg-[#0d5f49] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? "送信中..." : "招待メール送信"}
            </button>
          </div>
          {inviteResult && (
            <p className={`text-xs mt-2 ${inviteResult.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {inviteResult.text}
            </p>
          )}
        </div>

        {/* 招待中ユーザー */}
        {invitedUsers.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-700 mb-3">
              招待中 <span className="text-gray-400 font-normal">({invitedUsers.length}人)</span>
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {invitedUsers.map((u) => (
                  <li key={u.auth_id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 text-sm">{u.email}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          認証待ち
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        招待日: {new Date(u.invited_at).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleResend(u.email)}
                        disabled={resending === u.email}
                        className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400
                                   px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resending === u.email ? "送信中..." : "招待再送"}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deleting === u.auth_id}
                        className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400
                                   px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === u.auth_id ? "削除中..." : "削除"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 登録済みユーザー */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">
            登録ユーザー一覧 <span className="text-gray-400 font-normal">({activeUsers.length}人)</span>
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {activeUsers.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              登録ユーザーがいません
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activeUsers.map((u) => (
                <li key={u.auth_id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800">{u.name}</span>
                      {u.role && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {u.role}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.permission === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {u.permission === "admin" ? "管理者" : "一般"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                    <div className="text-xs text-gray-300 mt-0.5">
                      登録日: {new Date(u.created_at).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleTogglePermission(u)}
                      disabled={updatingPermission === u.auth_id}
                      className={`text-xs border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        u.permission === "admin"
                          ? "text-purple-500 hover:text-purple-700 border-purple-200 hover:border-purple-400"
                          : "text-gray-400 hover:text-purple-600 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {updatingPermission === u.auth_id
                        ? "変更中..."
                        : u.permission === "admin" ? "一般に変更" : "管理者に変更"}
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={deleting === u.auth_id}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400
                                 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === u.auth_id ? "削除中..." : "削除"}
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
