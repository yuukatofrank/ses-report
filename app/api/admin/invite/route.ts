import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { email, redirectTo: clientRedirectTo } = await request.json();
  const appUrl = process.env.APP_URL || clientRedirectTo;

  if (!email) {
    return NextResponse.json({ error: "メールアドレスは必須です" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // 未確認ユーザーが既に存在する場合は削除してから再招待
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const existing = users.find((u) => u.email === email);
  if (existing) {
    await supabaseAdmin.auth.admin.deleteUser(existing.id);
  }

  // 招待リンクを生成
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
  });

  if (linkError || !linkData) {
    return NextResponse.json({ error: linkError?.message ?? "招待リンクの生成に失敗しました" }, { status: 500 });
  }

  // token_hashを使って自前のURLを構築（action_linkはPKCE問題があるため使わない）
  const tokenHash = linkData.properties?.hashed_token;
  const inviteUrl = `${appUrl}/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=invite`;

  // 有効期限（24時間後）をJST で計算
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const jst = new Date(expiresAt.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const expiryLabel = `${jst.getUTCFullYear()}/${pad(jst.getUTCMonth() + 1)}/${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`;

  // Resendでメール送信
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Kaku Gothic Pro', 'Yu Gothic', Meiryo, sans-serif; color: #333; margin: 0; padding: 0; background: #f7f7f5; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 16px; font-weight: bold; opacity: 0.8; }
    .header h2 { margin: 8px 0 0; font-size: 22px; font-weight: bold; }
    .body { padding: 32px; }
    .body p { font-size: 15px; line-height: 1.8; color: #444; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #0f6e56; color: #fff; font-size: 15px; font-weight: bold; padding: 14px 36px; border-radius: 8px; text-decoration: none; }
    .note { font-size: 12px; color: #999; margin-top: 24px; }
    .footer { background: #f7f7f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>frankSQUARE</h1>
      <h2>月次報告システムへご招待</h2>
    </div>
    <div class="body">
      <p>frankSQUARE月次報告システムへの招待メールをお送りしました。<br>下のボタンからアカウントを設定してご利用ください。</p>
      <div class="btn-wrap">
        <a href="${inviteUrl}" class="btn">アカウントを設定する</a>
      </div>
      <p class="note">このリンクの有効期限は <strong>${expiryLabel}</strong> までです。期限が切れた場合は管理者に再送をご依頼ください。<br>心当たりがない場合は無視してください。</p>
    </div>
    <div class="footer">
      このメールはfrankSQUARE月次報告システムから自動送信されました
    </div>
  </div>
</body>
</html>
`;

  const { error: mailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@franksquare.co.jp",
    to: email,
    subject: "【frankSQUARE】月次報告システムへのご招待",
    html,
  });

  if (mailError) {
    return NextResponse.json({ error: mailError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
