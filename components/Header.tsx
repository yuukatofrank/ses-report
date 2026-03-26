"use client";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6"
      style={{ backgroundColor: "#1a1a2e", height: "56px" }}
    >
      <div className="flex items-center gap-3">
        {/* ハンバーガーメニュー（モバイルのみ） */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-white p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="メニュー"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-base md:text-lg tracking-wide">
          frankSQUARE<span className="hidden sm:inline">月次報告</span><span className="sm:hidden">月報</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {member && (
          <span className="hidden md:block text-white/70 text-sm truncate max-w-[160px]">
            {member.name}{member.role ? ` · ${member.role}` : ""}
          </span>
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
    </header>
  );
}
