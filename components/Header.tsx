"use client";

import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/UserProvider";

interface HeaderProps {
  onEditProfile: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({ onEditProfile, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { isAdmin, member } = useUser();

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
        {/* ハンバーガーメニュー（モバイル + サイドバーがあるページのみ） */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-white p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="メニュー"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link href="/" className="text-white font-bold text-sm md:text-lg tracking-wide hover:text-white/80 transition-colors">
          frankSQUARE<span className="hidden sm:inline">管理システム</span><span className="sm:hidden">管理</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {member && (
          <span className="hidden md:block text-white/70 text-sm truncate max-w-[160px]">
            {member.name}
          </span>
        )}

        {member && (
          <Link
            href="/reports"
            className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                       font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
          >
            月報
          </Link>
        )}

        {member && (
          <Link
            href="/expenses"
            className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                       font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
          >
            経費
          </Link>
        )}

        {isAdmin && (
          <>
            <Link
              href="/invoices"
              className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                         font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
            >
              請求書
            </Link>
            <Link
              href="/admin"
              className="text-white/70 hover:text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm
                         font-medium hover:bg-white/10 transition-colors border border-white/20 whitespace-nowrap"
            >
              管理
            </Link>
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
