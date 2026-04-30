import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase";
import { UserProvider } from "./UserProvider";
import { Member } from "@/types";

export const metadata: Metadata = {
  title: "frankSQUARE管理システム",
  description: "frankSQUARE社内管理システム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "管理システム",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

async function getInitialUserAndMember(): Promise<{
  userId: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  member: Member | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, userEmail: null, isAdmin: false, member: null };
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = !!adminEmail && user.email === adminEmail;

  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    isAdmin,
    member: (member as Member | null) ?? null,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = await getInitialUserAndMember();

  return (
    <html lang="ja">
      <body className="antialiased">
        <UserProvider
          initialUserId={initial.userId}
          initialUserEmail={initial.userEmail}
          initialMember={initial.member}
          isAdmin={initial.isAdmin}
        >
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
