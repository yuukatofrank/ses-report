"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Member } from "@/types";

type DashboardStats = {
  thisMonthReportStatus: "未作成" | "下書き" | "提出済" | "確認済" | "差戻し";
  thisMonthLabel: string;
  myExpenseSubmittedCount: number;
  pendingReportsCount: number;
  pendingExpensesCount: number;
  latestInvoiceMonth: string | null;
};

type CardProps = {
  href: string;
  icon: string;
  title: string;
  status: string;
  badge?: { text: string; color: "red" | "yellow" | "green" | "gray" };
  description?: string;
  primary?: boolean;
};

const BADGE_COLOR: Record<NonNullable<CardProps["badge"]>["color"], string> = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-700",
  gray: "bg-slate-100 text-slate-600",
};

function FeatureCard({ href, icon, title, status, badge, description, primary }: CardProps) {
  return (
    <Link
      href={href}
      className={`group relative block rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        primary
          ? "bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-700"
          : "bg-white text-slate-900 border-slate-200 hover:border-emerald-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-3xl">{icon}</div>
        {badge && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLOR[badge.color]}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className={`text-base font-bold ${primary ? "text-white" : "text-slate-900"}`}>{title}</h3>
        <p className={`mt-1 text-sm ${primary ? "text-emerald-100" : "text-slate-600"}`}>{status}</p>
        {description && (
          <p className={`mt-1 text-xs ${primary ? "text-emerald-200/80" : "text-slate-400"}`}>{description}</p>
        )}
      </div>
      <div className={`mt-3 text-xs font-medium ${primary ? "text-emerald-200" : "text-emerald-700"} group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1`}>
        開く <span>→</span>
      </div>
    </Link>
  );
}

function statusBadgeForReport(status: DashboardStats["thisMonthReportStatus"]): CardProps["badge"] | undefined {
  switch (status) {
    case "未作成":
      return { text: "未作成", color: "red" };
    case "下書き":
      return { text: "下書き", color: "yellow" };
    case "提出済":
      return { text: "提出済", color: "green" };
    case "確認済":
      return { text: "確認済", color: "gray" };
    case "差戻し":
      return { text: "差戻し", color: "red" };
  }
}

export default function DashboardClient({
  stats,
  member,
  isAdmin,
}: {
  stats: DashboardStats;
  member: Member;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(member.name);
  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: member.user_id,
          name: profileName.trim(),
          role: member.role,
          email: member.email,
        }),
      });
      if (res.ok) {
        setShowProfileModal(false);
        router.refresh();
      }
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <>
      <Header onEditProfile={() => setShowProfileModal(true)} />
      <main className="min-h-screen bg-slate-50 pt-16 pb-10 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* 挨拶セクション */}
          <section className="mt-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              おかえりなさい、{member.name}さん
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {stats.thisMonthLabel}の月報ステータス：
              <span className="ml-1 font-semibold text-slate-900">{stats.thisMonthReportStatus}</span>
              {stats.thisMonthReportStatus === "未作成" && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  まだ作成されていません
                </span>
              )}
              {stats.thisMonthReportStatus === "差戻し" && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  対応が必要です
                </span>
              )}
            </p>
          </section>

          {/* 主機能カード */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">業務</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FeatureCard
                href="/reports"
                icon="📝"
                title="月次報告"
                status={`${stats.thisMonthLabel}：${stats.thisMonthReportStatus}`}
                badge={statusBadgeForReport(stats.thisMonthReportStatus)}
                description="月報の作成・提出・確認"
                primary={stats.thisMonthReportStatus === "未作成" || stats.thisMonthReportStatus === "差戻し"}
              />
              <FeatureCard
                href="/expenses"
                icon="💰"
                title="経費申請"
                status={
                  stats.myExpenseSubmittedCount > 0
                    ? `${stats.myExpenseSubmittedCount}件 申請中`
                    : "申請中の経費なし"
                }
                badge={
                  stats.myExpenseSubmittedCount > 0
                    ? { text: `${stats.myExpenseSubmittedCount}件`, color: "yellow" }
                    : undefined
                }
                description="経費の申請・領収書アップロード"
              />
              <FeatureCard
                href="/tools/pdf-merge"
                icon="📎"
                title="PDF結合"
                status="複数PDFを1ファイルに"
                description="領収書・契約書のまとめ"
              />
            </div>
          </section>

          {/* 管理者向けカード */}
          {isAdmin && (
            <section className="mt-8">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">管理</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FeatureCard
                  href="/invoices"
                  icon="🧾"
                  title="請求書"
                  status={
                    stats.latestInvoiceMonth
                      ? `最新発行：${stats.latestInvoiceMonth}`
                      : "発行履歴なし"
                  }
                  description="請求書の発行・PDF出力"
                />
                <FeatureCard
                  href="/admin"
                  icon="👥"
                  title="ユーザー管理"
                  status="メンバー招待・権限管理"
                  description="ユーザーアカウントの管理"
                />
                <FeatureCard
                  href="/reports"
                  icon="✅"
                  title="承認待ち"
                  status={`月報 ${stats.pendingReportsCount}件 / 経費 ${stats.pendingExpensesCount}件`}
                  badge={
                    stats.pendingReportsCount + stats.pendingExpensesCount > 0
                      ? {
                          text: `${stats.pendingReportsCount + stats.pendingExpensesCount}件`,
                          color: "yellow",
                        }
                      : undefined
                  }
                  description="メンバーからの提出を確認"
                />
              </div>
            </section>
          )}
        </div>
      </main>

      {/* プロフィール編集モーダル */}
      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">プロフィール編集</h2>
            <label className="block text-sm font-medium text-slate-700 mb-1">氏名 *</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!profileName.trim() || profileSaving}
                className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
              >
                {profileSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
