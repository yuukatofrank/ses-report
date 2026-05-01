import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // Supabaseのパスワードリセット/招待リンクからの戻り（PKCE flow）を type に応じて振り分ける
  // Supabaseが redirectTo を尊重せず Site URL（ /） に飛ばしてくるケースの救済
  const code = searchParams.get("code");
  const flowType = searchParams.get("type");
  if (code && pathname === "/") {
    // invite/email_change 系は新規パスワード設定画面へ、それ以外（recovery含む）はリセット画面へ
    const targetPath =
      flowType === "invite" || flowType === "email_change" || flowType === "signup"
        ? "/auth/set-password"
        : "/auth/reset-password";
    const target = new URL(targetPath, request.url);
    target.searchParams.set("code", code);
    if (flowType) target.searchParams.set("type", flowType);
    return NextResponse.redirect(target);
  }

  // 未認証ユーザーを /auth にリダイレクト（認証フロー系ページは除外）
  const authPublicPaths = ["/auth", "/auth/set-password", "/auth/callback", "/auth/forgot-password", "/auth/reset-password"];
  if (!user && !authPublicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // 認証済みユーザーが /auth にアクセスしたら / にリダイレクト
  if (user && pathname === "/auth") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 請求書関連は最高権限ユーザーのみアクセス可
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (pathname.startsWith("/invoices") && user?.email !== adminEmail) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
