import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { memberId, memberName, month, reason, expenseUrl } = body;

  if (!memberName || !month || !memberId) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  // メンバーのメールアドレスをDBから取得
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: memberData } = await supabaseAdmin
    .from("members")
    .select("email, user_id")
    .eq("id", memberId)
    .single();

  let memberEmail = memberData?.email;
  if (!memberEmail && memberData?.user_id) {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(memberData.user_id);
    memberEmail = authData?.user?.email;
  }

  if (!memberEmail) {
    return NextResponse.json({ error: "メールアドレスが見つかりません" }, { status: 400 });
  }

  const monthLabel = formatMonth(month);

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
    .badge { display: inline-block; background: #ef4444; color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
    .body { padding: 28px 32px; }
    .meta { background: #f7f7f5; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #555; }
    .meta span { display: block; margin-bottom: 4px; }
    .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px 18px; margin-bottom: 24px; }
    .reason-label { font-size: 11px; font-weight: bold; color: #ef4444; margin-bottom: 8px; }
    .reason-text { font-size: 14px; color: #444; line-height: 1.7; white-space: pre-wrap; }
    .btn-wrap { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background: #0f6e56; color: #fff; font-size: 14px; font-weight: bold; padding: 12px 28px; border-radius: 8px; text-decoration: none; }
    .footer { background: #f7f7f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>frankSQUARE経費申請</h1>
      <h2>経費申請が差し戻されました</h2>
      <span class="badge">🔄 差し戻し</span>
    </div>
    <div class="body">
      <div class="meta">
        <span>👤 申請者：${memberName}</span>
        <span>📅 対象月：${monthLabel}</span>
      </div>
      ${reason ? `
      <div class="reason-box">
        <div class="reason-label">差し戻し理由</div>
        <div class="reason-text">${reason}</div>
      </div>
      ` : ""}
      <p style="font-size: 14px; color: #555; line-height: 1.7;">内容を修正の上、再度申請してください。</p>
      ${expenseUrl ? `<div class="btn-wrap"><a href="${expenseUrl}" class="btn">経費申請を確認する</a></div>` : ""}
    </div>
    <div class="footer">
      このメールはfrankSQUARE管理システムから自動送信されました
    </div>
  </div>
</body>
</html>
`;

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@franksquare.co.jp",
      to: memberEmail,
      subject: `【経費申請】${monthLabel}分が差し戻されました`,
      html,
    });

    if (error) {
      console.error("Expense return notify error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Expense return notify error:", err);
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}
