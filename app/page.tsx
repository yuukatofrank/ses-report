"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ReportForm from "@/components/ReportForm";
import ReportViewer from "@/components/ReportViewer";
import { Member, Report } from "@/types";

type ViewMode = "idle" | "form-new" | "form-edit" | "view";

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("idle");
  const [loading, setLoading] = useState(true);

  // メンバー一覧取得
  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/members");
    if (res.ok) {
      const data = await res.json();
      setMembers(data);
    }
  }, []);

  // 報告書一覧取得
  const fetchReports = useCallback(async () => {
    const url = selectedMember
      ? `/api/reports?member_id=${selectedMember.id}`
      : "/api/reports";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setReports(data);
    }
  }, [selectedMember]);

  useEffect(() => {
    fetchMembers().finally(() => setLoading(false));
  }, [fetchMembers]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // メンバー追加
  const handleAddMember = async (name: string, role: string) => {
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    if (res.ok) {
      const newMember = await res.json();
      await fetchMembers();
      setSelectedMember(newMember);
    } else {
      const err = await res.json();
      alert(err.error || "メンバー追加に失敗しました");
    }
  };

  // メンバー削除
  const handleDeleteMember = async (id: string) => {
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchMembers();
      setSelectedMember(null);
      setSelectedReport(null);
      setViewMode("idle");
      await fetchReports();
    } else {
      alert("削除に失敗しました");
    }
  };

  // 報告書選択
  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    setViewMode("view");
  };

  // 新規報告書
  const handleNewReport = () => {
    setSelectedReport(null);
    setViewMode("form-new");
  };

  // 報告書保存（新規 or 更新）
  const handleSaveReport = async (
    data: Partial<Report>,
    status: "draft" | "final"
  ) => {
    if (viewMode === "form-new") {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      });
      if (res.ok) {
        const saved = await res.json();
        await fetchReports();
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
        await fetchReports();
        setSelectedReport(saved);
        setViewMode("view");
      } else {
        alert("更新に失敗しました");
      }
    }
  };

  // 報告書削除
  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    const res = await fetch(`/api/reports/${selectedReport.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchReports();
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
        members={members}
        selectedMember={selectedMember}
        onSelectMember={(m) => {
          setSelectedMember(m);
          setSelectedReport(null);
          setViewMode("idle");
        }}
        onAddMember={handleAddMember}
        onDeleteMember={handleDeleteMember}
      />

      <Sidebar
        reports={reports}
        selectedReport={selectedReport}
        selectedMember={selectedMember}
        onSelectReport={handleSelectReport}
        onNewReport={handleNewReport}
      />

      {/* メインエリア */}
      <main
        className="min-h-screen overflow-y-auto"
        style={{ paddingTop: "56px", marginLeft: "260px" }}
      >
        {viewMode === "idle" && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-medium">
              {selectedMember
                ? "報告書を選択するか、新規作成してください"
                : "左上のメニューからメンバーを選択してください"}
            </p>
          </div>
        )}

        {(viewMode === "form-new" || viewMode === "form-edit") &&
          selectedMember && (
            <ReportForm
              member={selectedMember}
              report={viewMode === "form-edit" ? selectedReport ?? undefined : undefined}
              onSave={handleSaveReport}
              onDelete={
                viewMode === "form-edit" ? handleDeleteReport : undefined
              }
              onCancel={() =>
                setViewMode(selectedReport ? "view" : "idle")
              }
            />
          )}

        {viewMode === "view" && selectedReport && (
          <ReportViewer
            report={selectedReport}
            onEdit={() => setViewMode("form-edit")}
          />
        )}
      </main>
    </>
  );
}
