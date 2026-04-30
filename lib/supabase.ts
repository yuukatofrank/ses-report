import { createClient } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// APIルート用（サーバーサイド）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 管理者操作用（Service Role）
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// クライアントコンポーネント用（認証セッションを保持）
// 同一ブラウザコンテキスト内で1度だけ生成（Multiple GoTrueClient 警告を回避）
let browserClientSingleton: ReturnType<typeof createBrowserClient> | null = null;
export function createSupabaseBrowserClient() {
  if (browserClientSingleton) return browserClientSingleton;
  browserClientSingleton = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClientSingleton;
}

// Server Component / Route Handler 用（cookieベースで認証コンテキスト保持）
export async function createSupabaseServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component から呼ばれた場合は set 不可。middleware が refresh を担当
        }
      },
    },
  });
}
