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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/members");
    if (res.ok) setMembers(await res.json());
  }, []);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/reports");
    if (res.ok) setReports(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchReports()]).finally(() =>
      setLoading(false)
    );
  }, [fetchMembers, fetchReports]);

  const handleAddMember = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), role: newRole.trim() }),
      });
      if (res.ok) {
        const newMember = await res.json();
        await fetchMembers();
        setSelectedMember(newMember);
        setNewName("");
        setNewRole("");
        setShowAddModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "メンバー追加に失敗しました");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchMembers();
      await fetchReports();
      setSelectedMember(null);
      setSelectedReport(null);
      setViewMode("idle");
    } else {
      alert("削除に失敗しました");
    }
  };

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    setViewMode("view");
  };

  const handleNewReport = () => {
    setSelectedReport(null);
    setViewMode("form-new");
  };

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
      <Header onAddMember={() => setShowAddModal(true)} />

      <Sidebar
        members={members}
        reports={reports}
        selectedMember={selectedMember}
        selectedReport={selectedReport}
        onSelectMember={(m) => {
          setSelectedMember(m);
          setSelectedReport(null);
          setViewMode("idle");
        }}
        onSelectReport={handleSelectReport}
        onNewReport={handleNewReport}
        onDeleteMember={handleDeleteMember}
        onAddMember={() => setShowAddModal(true)}
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
                ? "月報を選択するか、新規作成してください"
                : "左のメンバー一覧からメンバーを選択してください"}
            </p>
          </div>
        )}

        {(viewMode === "form-new" || viewMode === "form-edit") &&
          selectedMember && (
            <ReportForm
              member={selectedMember}
              report={
                viewMode === "form-edit" ? selectedReport ?? undefined : undefined
              }
              onSave={handleSaveReport}
              onDelete={
                viewMode === "form-edit" ? handleDeleteReport : undefined
              }
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

      {/* メンバー追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-gray-800 mb-4">
              メンバー追加
            </h2>
            <div className="space-y-3">
              <div>
                <label className="label">氏名 *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field"
                  placeholder="山田 太郎"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                />
              </div>
              <div>
                <label className="label">役職・ポジション</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="input-field"
                  placeholder="フロントエンドエンジニア"
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewName("");
                  setNewRole("");
                }}
                className="btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newName.trim() || adding}
                className="btn-primary flex-1"
              >
                {adding ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
