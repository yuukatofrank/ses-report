"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Member } from "@/types";

interface HeaderProps {
  member: Member | null;
  onEditProfile: () => void;
}

export default function Header({ member, onEditProfile }: HeaderProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-0"
      style={{ backgroundColor: "#1a1a2e", height: "56px" }}
    >
      <h1 className="text-white font-bold text-lg tracking-wide">
        frankSQUARE月次報告
      </h1>

      <div className="flex items-center gap-3">
        {member && (
          <span className="text-white/70 text-sm">
            {member.name}{member.role ? ` · ${member.role}` : ""}
          </span>
        )}

        <button
          onClick={onEditProfile}
          className="bg-[#0f6e56] text-white px-3 py-1.5 rounded-lg text-sm
                     font-medium hover:bg-[#138a6b] transition-colors"
        >
          {member ? "プロフィール編集" : "プロフィール設定"}
        </button>

        <button
          onClick={handleLogout}
          className="text-white/70 hover:text-white px-3 py-1.5 rounded-lg text-sm
                     font-medium hover:bg-white/10 transition-colors border border-white/20"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
