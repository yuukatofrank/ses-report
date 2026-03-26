"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ReportForm from "@/components/ReportForm";
import ReportViewer from "@/components/ReportViewer";
import { Member, Report } from "@/types";

type ViewMode = "idle" | "form-new" | "form-edit" | "view";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("idle");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // プロフィールモーダル
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // 認証チェック
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth");
      } else {
        setUserId(data.user.id);
        setUserEmail(data.user.email ?? null);
      }
    });
  }, [router, supabase]);

  const fetchProfile = useCallback(async (uid: string) => {
    const res = await fetch(`/api/profile?user_id=${uid}`);
    if (res.ok) {
      const data = await res.json();
      return data as Member | null;
    }
    return null;
  }, []);

  const fetchReports = useCallback(async (memberId: string) => {
    const res = await fetch(`/api/reports?member_id=${memberId}`);
    if (res.ok) setReports(await res.json());
  }, []);

  useEffect(() => {
    if (!userId) return;
    const init = async () => {
      const profile = await fetchProfile(userId);
      setMember(profile);
      if (!profile) {
        setShowProfileModal(true);
      } else {
        await fetchReports(profile.id);
        // URLパラメータから報告書を自動表示
        const reportId = searchParams.get("report_id");
        if (reportId) {
          const res = await fetch(`/api/reports/${reportId}`);
          if (res.ok) {
            const report = await res.json();
            setSelectedReport(report);
            setViewMode("view");
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [userId, fetchProfile, fetchReports]);

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !userId) return;
    setProfileSaving(true);
    try {
      const method = member ? "PUT" : "POST";
      const res = await fetch("/api/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: profileName.trim(),
          role: profileRole.trim(),
          email: userEmail,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMember(updated);
        setShowProfileModal(false);
        await fetchReports(updated.id);
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const openEditProfile = () => {
    setProfileName(member?.name || "");
    setProfileRole(member?.role || "");
    setShowProfileModal(true);
  };

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    setViewMode("view");
  };

  const handleNewReport = () => {
    setSelectedReport(null);
    setViewMode("form-new");
  };

  const handleSaveReport = async (data: Partial<Report>, status: "draft" | "final") => {
    if (viewMode === "form-new") {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (member) await fetchReports(member.id);
        setSelectedReport(saved);
        setViewMode("view");
      } else {
        const err = await res.json();
        alert(err.error || "保存に失敗しました");
      }
    } else if (viewMode === "form-edit" && selectedReport) {
      const res = await fetch(`/api/reports/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (member) await fetchReports(member.id);
        setSelectedReport(saved);
        setViewMode("view");
      } else {
        alert("更新に失敗しました");
      }
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    const res = await fetch(`/api/reports/${selectedReport.id}`, { method: "DELETE" });
    if (res.ok) {
      if (member) await fetchReports(member.id);
      setSelectedReport(null);
      setViewMode("idle");
    } else {
      alert("削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <>
      <Header
        member={member}
        onEditProfile={openEditProfile}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <Sidebar
        member={member}
        reports={reports}
        selectedReport={selectedReport}
        onSelectReport={handleSelectReport}
        onNewReport={handleNewReport}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* メインエリア */}
      <main className="min-h-screen overflow-y-auto pt-[56px] md:ml-[260px]">
        {viewMode === "idle" && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-gray-400 px-4 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-base md:text-lg font-medium">
              {member
                ? "月報を選択するか、新規作成してください"
                : "プロフィールを設定してください"}
            </p>
            {member && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden btn-secondary text-sm"
                >
                  📋 月報一覧
                </button>
                <button
                  onClick={handleNewReport}
                  className="btn-primary text-sm"
                >
                  ＋ 新規作成
                </button>
              </div>
            )}
          </div>
        )}

        {(viewMode === "form-new" || viewMode === "form-edit") && member && (
          <ReportForm
            member={member}
            report={viewMode === "form-edit" ? selectedReport ?? undefined : undefined}
            onSave={handleSaveReport}
            onDelete={viewMode === "form-edit" ? handleDeleteReport : undefined}
            onCancel={() => setViewMode(selectedReport ? "view" : "idle")}
          />
        )}

        {viewMode === "view" && selectedReport && (
          <ReportViewer
            report={selectedReport}
            onEdit={() => setViewMode("form-edit")}
          />
        )}
      </main>

      {/* プロフィール設定・編集モーダル */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-gray-800 mb-1">
              {member ? "プロフィール編集" : "プロフィール設定"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {member ? "名前・役職を変更できます" : "月報を作成する前に名前を登録してください"}
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">氏名 *</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="input-field"
                  placeholder="山田 太郎"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                />
              </div>
              <div>
                <label className="label">役職・ポジション</label>
                <input
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  className="input-field"
                  placeholder="フロントエンドエンジニア"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              {member && (
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="btn-secondary flex-1"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={!profileName.trim() || profileSaving}
                className="btn-primary flex-1"
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
