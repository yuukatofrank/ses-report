"use client";

import { useState, useRef } from "react";

interface FileItem {
  id: string;
  file: File;
}

export default function PdfMergePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const items: FileItem[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        items.push({ id: crypto.randomUUID(), file: f });
      }
    }
    if (items.length === 0) { setError("PDFファイルのみ対応しています"); return; }
    setError("");
    setFiles((prev) => [...prev, ...items]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOver.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...files];
    const [item] = updated.splice(dragItem.current, 1);
    updated.splice(dragOver.current, 0, item);
    setFiles(updated);
    dragItem.current = null;
    dragOver.current = null;
  };

  const handleMerge = async () => {
    if (files.length < 2) { setError("2つ以上のPDFを追加してください"); return; }
    setMerging(true);
    setError("");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));

      const res = await fetch("/api/pdf-merge", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "結合に失敗しました");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setMerging(false);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.file.size, 0);
  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f7f7f5" }}>
      <div style={{ backgroundColor: "#1a1a2e", padding: "16px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ color: "#fff", fontSize: 16, fontWeight: "bold", margin: 0 }}>PDF結合ツール</h1>
          <a href="/" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>← 戻る</a>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); addFiles(e.dataTransfer.files); }}
          style={{
            border: "2px dashed #ccc", borderRadius: 12, padding: "32px 16px",
            textAlign: "center", cursor: "pointer", marginBottom: 20,
            backgroundColor: "#fff", transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0f6e56")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ccc")}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>クリックまたはドラッグ&amp;ドロップでPDFを追加</p>
          <p style={{ fontSize: 12, color: "#999", margin: "4px 0 0" }}>複数ファイル選択可</p>
          <input ref={inputRef} type="file" accept=".pdf" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#333" }}>{files.length} ファイル（{fmtSize(totalSize)}）</span>
              <button onClick={() => setFiles([])} style={{ fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer" }}>全てクリア</button>
            </div>
            {files.map((f, i) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  display: "flex", alignItems: "center", padding: "10px 16px",
                  borderBottom: i < files.length - 1 ? "1px solid #f0f0f0" : "none",
                  cursor: "grab", fontSize: 13,
                }}
              >
                <span style={{ color: "#999", marginRight: 10, fontSize: 11, minWidth: 20 }}>☰</span>
                <span style={{ flex: 1, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</span>
                <span style={{ color: "#999", fontSize: 11, marginRight: 12 }}>{fmtSize(f.file.size)}</span>
                <button onClick={() => removeFile(f.id)} style={{ color: "#ccc", background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Merge button */}
        <button
          onClick={handleMerge}
          disabled={files.length < 2 || merging}
          style={{
            width: "100%", padding: "14px", fontSize: 15, fontWeight: "bold",
            backgroundColor: files.length < 2 || merging ? "#ccc" : "#0f6e56",
            color: "#fff", border: "none", borderRadius: 10, cursor: files.length < 2 || merging ? "default" : "pointer",
          }}
        >
          {merging ? "結合中..." : "PDFを結合してダウンロード"}
        </button>

        <p style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 12 }}>
          ドラッグで並び替え可能。上から順に結合されます。
        </p>
      </div>
    </div>
  );
}
