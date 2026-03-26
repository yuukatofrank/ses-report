"use client";

import { useState } from "react";
import { Member } from "@/types";

interface HeaderProps {
  members: Member[];
  selectedMember: Member | null;
  onSelectMember: (member: Member | null) => void;
  onAddMember: (name: string, role: string) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

export default function Header({
  members,
  selectedMember,
  onSelectMember,
  onAddMember,
  onDeleteMember,
}: HeaderProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddMember(newName.trim(), newRole.trim());
      setNewName("");
      setNewRole("");
      setShowAddModal(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-0"
        style={{ backgroundColor: "#1a1a2e", height: "56px" }}
      >
        <h1 className="text-white font-bold text-lg tracking-wide">
          SES月次報告システム
        </h1>

        <div className="flex items-center gap-3">
          {/* メンバー切り替えセレクト */}
          <select
            value={selectedMember?.id ?? ""}
            onChange={(e) => {
              const m = members.find((m) => m.id === e.target.value) || null;
              onSelectMember(m);
            }}
            className="bg-white/10 text-white border border-white/20 rounded-lg
                       px-3 py-1.5 text-sm focus:outline-none focus:ring-2
                       focus:ring-white/40 min-w-[140px]"
          >
            <option value="" className="bg-[#1a1a2e]">
              メンバーを選択
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1a1a2e]">
                {m.name}
                {m.role ? ` (${m.role})` : ""}
              </option>
            ))}
          </select>

          {/* メンバー追加ボタン */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#0f6e56] text-white px-3 py-1.5 rounded-lg text-sm
                       font-medium hover:bg-[#138a6b] transition-colors"
          >
            ＋ メンバー追加
          </button>

          {/* メンバー削除ボタン */}
          {selectedMember && (
            <button
              onClick={async () => {
                if (
                  confirm(
                    `「${selectedMember.name}」を削除しますか？\n関連する報告書もすべて削除されます。`
                  )
                ) {
                  await onDeleteMember(selectedMember.id);
                }
              }}
              className="bg-red-500/80 text-white px-3 py-1.5 rounded-lg text-sm
                         font-medium hover:bg-red-500 transition-colors"
            >
              削除
            </button>
          )}
        </div>
      </header>

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
                onClick={handleAdd}
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
