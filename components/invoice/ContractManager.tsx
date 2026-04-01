"use client";

import { useState, useEffect } from "react";
import { Client, Contract, ContractItem, Member } from "@/types";

interface Props {
  onClose: () => void;
}

const EMPTY_ITEM = (): ContractItem => ({ name: "", unit_price: 0, tax_exempt: false, sort_order: 0 });

export default function ContractManager({ onClose }: Props) {
  const [tab, setTab] = useState<"clients" | "contracts">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Client form
  const [clientName, setClientName] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientSaving, setClientSaving] = useState(false);

  // Contract form
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [cClientId, setCClientId] = useState("");
  const [cMemberId, setCMemberId] = useState("");
  const [cProjectName, setCProjectName] = useState("");
  const [cOrderNumber, setCOrderNumber] = useState("");
  const [cTaskDescription, setCTaskDescription] = useState("");
  const [cOffset, setCOffset] = useState(1);
  const [cDay, setCDay] = useState(10);
  const [cPdfFilename, setCPdfFilename] = useState("");
  const [cItems, setCItems] = useState<ContractItem[]>([EMPTY_ITEM()]);
  const [contractSaving, setContractSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/contracts").then((r) => r.json()).then(setContracts);
    fetch("/api/members").then((r) => r.json()).then(setMembers);
  }, []);

  // ---- Clients ----
  const saveClient = async () => {
    if (!clientName.trim()) return;
    setClientSaving(true);
    const method = editingClient ? "PUT" : "POST";
    const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: clientName }) });
    if (res.ok) { await fetch("/api/clients").then((r) => r.json()).then(setClients); setClientName(""); setEditingClient(null); }
    setClientSaving(false);
  };

  const deleteClient = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？関連する契約も削除されます。`)) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    const [c, co] = await Promise.all([fetch("/api/clients").then((r) => r.json()), fetch("/api/contracts").then((r) => r.json())]);
    setClients(c); setContracts(co);
  };

  // ---- Contracts ----
  const openNewContract = () => {
    setEditingContract(null);
    setCClientId(""); setCMemberId(""); setCProjectName(""); setCOrderNumber(""); setCTaskDescription(""); setCOffset(1); setCDay(10); setCPdfFilename(""); setCItems([EMPTY_ITEM()]);
    setShowContractForm(true);
  };

  const openEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setCClientId(contract.client_id);
    setCMemberId(contract.member_id);
    setCProjectName(contract.project_name);
    setCOrderNumber(contract.order_number ?? "");
    setCTaskDescription(contract.task_description ?? "");
    setCOffset(contract.payment_month_offset);
    setCDay(contract.payment_day);
    setCPdfFilename(contract.pdf_filename ?? "");
    setCItems(contract.items?.length ? [...contract.items].sort((a, b) => a.sort_order - b.sort_order) : [EMPTY_ITEM()]);
    setShowContractForm(true);
  };

  const saveContract = async () => {
    if (!cClientId || !cMemberId || !cProjectName.trim()) { alert("必須項目を入力してください"); return; }
    if (cItems.some((i) => !i.name.trim())) { alert("品名を入力してください"); return; }
    setContractSaving(true);
    const method = editingContract ? "PUT" : "POST";
    const url = editingContract ? `/api/contracts/${editingContract.id}` : "/api/contracts";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: cClientId, member_id: cMemberId, project_name: cProjectName, order_number: cOrderNumber || null, task_description: cTaskDescription || null, payment_month_offset: cOffset, payment_day: cDay, pdf_filename: cPdfFilename, items: cItems }),
    });
    if (res.ok) { setContracts(await fetch("/api/contracts").then((r) => r.json())); setShowContractForm(false); }
    setContractSaving(false);
  };

  const deleteContract = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？関連する請求書も削除されます。`)) return;
    await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    setContracts(await fetch("/api/contracts").then((r) => r.json()));
  };

  const updateItem = (i: number, field: keyof ContractItem, value: string | number | boolean) =>
    setCItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const offsetLabel = (offset: number, day: number) =>
    `翌${offset === 1 ? "" : offset + "ヶ"}月${day === 0 ? "末" : day + "日"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">マスタ管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex border-b">
          {(["clients", "contracts"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setShowContractForm(false); }}
              className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t ? "text-[#0f6e56] border-b-2 border-[#0f6e56]" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "clients" ? "得意先" : "契約"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {/* ---- 得意先タブ ---- */}
          {tab === "clients" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">{editingClient ? "編集" : "追加"}</p>
                <div className="flex gap-2">
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="例：株式会社Reevon" className="input-field flex-1"
                    onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && saveClient()} />
                  <button onClick={saveClient} disabled={!clientName.trim() || clientSaving} className="btn-primary whitespace-nowrap">
                    {clientSaving ? "..." : editingClient ? "更新" : "追加"}
                  </button>
                  {editingClient && <button onClick={() => { setEditingClient(null); setClientName(""); }} className="btn-secondary">取消</button>}
                </div>
              </div>
              {clients.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">得意先がありません</p> : (
                <ul className="divide-y">
                  {clients.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-800">{c.name}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingClient(c); setClientName(c.name); }} className="text-xs text-[#0f6e56] hover:underline">編集</button>
                        <button onClick={() => deleteClient(c.id, c.name)} className="text-xs text-red-400 hover:underline">削除</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---- 契約タブ ---- */}
          {tab === "contracts" && (
            <div className="space-y-4">
              {!showContractForm && (
                <button onClick={openNewContract} className="btn-primary w-full">＋ 契約を追加</button>
              )}

              {showContractForm && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-600">{editingContract ? "契約を編集" : "契約を追加"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">得意先 *</label>
                      <select value={cClientId} onChange={(e) => setCClientId(e.target.value)} className="input-field">
                        <option value="">選択</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">作業者 *</label>
                      <select value={cMemberId} onChange={(e) => setCMemberId(e.target.value)} className="input-field">
                        <option value="">選択</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">案件名 *</label>
                    <input type="text" value={cProjectName} onChange={(e) => setCProjectName(e.target.value)}
                      placeholder="例：BRMS設計・開発支援" className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">注文番号</label>
                      <input type="text" value={cOrderNumber} onChange={(e) => setCOrderNumber(e.target.value)}
                        placeholder="例：FSQ-C2509-10" className="input-field" />
                    </div>
                    <div>
                      <label className="label">受託業務内容</label>
                      <input type="text" value={cTaskDescription} onChange={(e) => setCTaskDescription(e.target.value)}
                        placeholder="例：システム運用オペレーション業務" className="input-field" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">支払サイト</label>
                      <select value={cOffset} onChange={(e) => setCOffset(Number(e.target.value))} className="input-field">
                        {[1, 2, 3].map((n) => <option key={n} value={n}>翌{n === 1 ? "" : n + "ヶ"}月</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="label">支払日</label>
                      <select value={cDay} onChange={(e) => setCDay(Number(e.target.value))} className="input-field">
                        <option value={0}>月末</option>
                        {[5, 10, 15, 20, 25, 28, 31].map((d) => <option key={d} value={d}>{d}日</option>)}
                      </select>
                    </div>
                  </div>

                  {/* PDFファイル名テンプレート */}
                  <div>
                    <label className="label">PDFファイル名</label>
                    <p className="text-xs text-gray-400 mb-1">品名と同じく <code className="bg-gray-100 px-1 rounded">{"{month}"}</code>・<code className="bg-gray-100 px-1 rounded">{"{worker}"}</code>・<code className="bg-gray-100 px-1 rounded">{"{project}"}</code>・<code className="bg-gray-100 px-1 rounded">{"{client}"}</code> が使えます（空白時は請求番号）</p>
                    <div className="flex items-center gap-1">
                      <input type="text" value={cPdfFilename} onChange={(e) => setCPdfFilename(e.target.value)}
                        placeholder="例：{client}_{month}請求書_{worker}" className="input-field flex-1" />
                      <span className="text-xs text-gray-400 shrink-0">.pdf</span>
                    </div>
                  </div>

                  {/* 明細テンプレート */}
                  <div>
                    <label className="label">明細テンプレート</label>
                    <p className="text-xs text-gray-400 mb-2">品名に <code className="bg-gray-100 px-1 rounded">{"{month}"}</code>（例: 1月度）・<code className="bg-gray-100 px-1 rounded">{"{worker}"}</code>（作業者名）・<code className="bg-gray-100 px-1 rounded">{"{project}"}</code>（案件名）が使えます</p>
                    <div className="space-y-2">
                      <div className="grid text-xs text-gray-500 font-medium" style={{ gridTemplateColumns: "1fr 110px 60px 24px" }}>
                        <span>品名</span><span className="text-right">単価</span><span className="text-center">非課税</span><span />
                      </div>
                      {cItems.map((item, i) => (
                        <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 110px 60px 24px" }}>
                          <input type="text" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)}
                            placeholder="品名" className="input-field text-sm" />
                          <input type="number" value={item.unit_price || ""} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))}
                            className="input-field text-sm text-right" placeholder="0" />
                          <div className="flex justify-center">
                            <input type="checkbox" checked={item.tax_exempt} onChange={(e) => updateItem(i, "tax_exempt", e.target.checked)} className="w-4 h-4 accent-[#0f6e56]" />
                          </div>
                          <button onClick={() => setCItems((prev) => prev.filter((_, idx) => idx !== i))}
                            disabled={cItems.length === 1} className="text-gray-300 hover:text-red-400 disabled:opacity-0 text-lg leading-none">×</button>
                        </div>
                      ))}
                      <button onClick={() => setCItems((prev) => [...prev, EMPTY_ITEM()])} className="text-sm text-[#0f6e56] hover:underline">＋ 行を追加</button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={saveContract} disabled={contractSaving} className="btn-primary">
                      {contractSaving ? "保存中..." : editingContract ? "更新" : "追加"}
                    </button>
                    <button onClick={() => setShowContractForm(false)} className="btn-secondary">キャンセル</button>
                  </div>
                </div>
              )}

              {contracts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">契約がありません</p>
              ) : (
                <ul className="divide-y">
                  {contracts.map((c) => {
                    const monthly = (c.items ?? []).reduce((s, i) => s + i.unit_price, 0);
                    return (
                      <li key={c.id} className="py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {(c.client as Client | undefined)?.name} × {c.project_name} × {(c.member as { name: string } | undefined)?.name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              支払：{offsetLabel(c.payment_month_offset, c.payment_day)}　／　{c.items?.length ?? 0}項目　／　¥{monthly.toLocaleString()}/月
                            </p>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button onClick={() => openEditContract(c)} className="text-xs text-[#0f6e56] hover:underline">編集</button>
                            <button onClick={() => deleteContract(c.id, c.project_name)} className="text-xs text-red-400 hover:underline">削除</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
