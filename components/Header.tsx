"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Member } from "@/types";

interface HeaderProps {
  member: Member | null;
  onEditProfile: () => void;
  onToggleSidebar: () => void;
}

export default function Header({ member, onEditProfile, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (adminEmail && data.user?.email === adminEmail) {
        setIsAdmin(true);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{ backgroundColor: "#1a1a2e", paddingTop: "var(--sat)" }}
    >
      <div className="flex items-center justify-between px-3 md:px-6" style={{ height: "var(--header-h)" }}>
      <div className="flex items-center gap-2">
        {/* ハンバーガーメニュー（モバイルのみ） */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-white p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="メニュー"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-sm md:text-lg tracking-wide">
          frankSQUARE<span className="hidden sm:inline">管理システム</span><span className="sm:hidden">管理</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {member && (
          <span className="hidden md:block text-white/70 text-sm truncate max-w-[160px]">
            {member.name}
          </span>
        )}

        {member && (
          <button
            onClick={() => router.push("/expenses")}
            className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                       font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
          >
            経費申請
          </button>
        )}

        {isAdmin && (
          <>
            <button
              onClick={() => router.push("/invoices")}
              className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                         font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
            >
              請求書
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                         font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
            >
              管理
            </button>
            <button
              onClick={() => router.push("/tools/pdf-merge")}
              className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                         font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
            >
              PDF結合
            </button>
          </>
        )}

        <button
          onClick={onEditProfile}
          className="bg-[#0f6e56] text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                     font-medium hover:bg-[#138a6b] transition-colors whitespace-nowrap"
        >
          {member ? "プロフィール" : "初期設定"}
        </button>

        <button
          onClick={handleLogout}
          className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                     font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
        >
          ログアウト
        </button>
      </div>
      </div>
    </header>
  );
}
