import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const { memberId, memberEmail: rawEmail, memberName, month, project, reason, reportUrl } = body;

  if (!memberName || !month) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  // メールアドレスが渡されていない場合、DBから取得する
  let memberEmail = rawEmail;
  if (!memberEmail && memberId) {
    const supabaseAdmin = createSupabaseAdminClient();
    // members テーブルから email を取得
    const { data: memberData } = await supabaseAdmin
      .from("members")
      .select("email, user_id")
      .eq("id", memberId)
      .single();

    if (memberData?.email) {
      memberEmail = memberData.email;
    } else if (memberData?.user_id) {
      // members.email が null の場合は auth.users から取得
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(memberData.user_id);
      memberEmail = user?.email ?? null;
    }
  }

  if (!memberEmail) {
    return NextResponse.json({ error: "送信先メールアドレスが取得できませんでした" }, { status: 400 });
  }

  const monthLabel = formatMonth(month);

  const reportUrlButton = reportUrl
    ? `<div style="text-align:center; padding: 12px 32px;">
        <a href="${reportUrl}" style="display:inline-block; background:#0f6e56; color:#fff; font-size:13px; font-weight:bold; padding:10px 24px; border-radius:6px; text-decoration:none;">
          📄 月報を確認・修正する
        </a>
      </div>`
    : "";

  const reasonBlock = reason
    ? `<div style="background:#fff8f0; border-left:4px solid #f97316; border-radius:0 8px 8px 0; padding:16px 18px; margin:24px 0;">
        <p style="font-size:11px; font-weight:bold; color:#f97316; margin:0 0 8px; text-transform:uppercase; letter-spacing:0.08em;">差し戻し理由</p>
        <p style="font-size:14px; color:#444; line-height:1.7; white-space:pre-wrap; margin:0;">${reason}</p>
      </div>`
    : `<p style="font-size:14px; color:#666; margin:16px 0;">担当者より内容の確認・修正をお願いします。</p>`;

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
    .badge { display: inline-block; background: #f97316; color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
    .body { padding: 28px 32px; }
    .meta { background: #f7f7f5; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #555; }
    .meta span { display: block; margin-bottom: 4px; }
    .footer { background: #f7f7f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>frankSQUARE月次報告</h1>
      <h2>月報が差し戻されました</h2>
      <span class="badge">↩ 差し戻し</span>
    </div>
    ${reportUrlButton}
    <div class="body">
      <div class="meta">
        <span>👤 氏名：${memberName}</span>
        ${project ? `<span>🗂 プロジェクト：${project}</span>` : ""}
        <span>📅 報告月：${monthLabel}</span>
      </div>

      <p style="font-size:14px; color:#333; line-height:1.7; margin:0 0 8px;">
        ${memberName} さん、お疲れさまです。<br>
        ${monthLabel}分の月報について、担当者より差し戻しが行われました。
      </p>

      ${reasonBlock}

      <p style="font-size:13px; color:#888; margin:24px 0 0;">
        内容を修正の上、再度ご提出をお願いいたします。
      </p>
    </div>
    <div class="footer">
      このメールはfrankSQUARE月次報告システムから自動送信されました
    </div>
  </div>
</body>
</html>
`;

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [memberEmail],
      subject: `【月次報告】${monthLabel}分の月報が差し戻されました`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify-returned error:", err);
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}
