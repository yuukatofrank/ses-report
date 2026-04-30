import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserProvider } from "./UserProvider";
import { getCurrentUser } from "@/lib/get-user";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = await getCurrentUser();

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
