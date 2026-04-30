import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const { memberEmail, memberName, month, project, comment, reportUrl } = body;

  if (!memberEmail || !memberName || !month) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
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
    .badge { display: inline-block; background: #0f6e56; color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
    .body { padding: 28px 32px; }
    .message { font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 24px; }
    .meta { background: #f7f7f5; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #555; }
    .meta span { display: block; margin-bottom: 4px; }
    .btn-wrap { text-align: center; margin: 24px 0; }
    .btn { display: inline-block; background: #0f6e56; color: #fff; font-size: 14px; font-weight: bold; padding: 12px 28px; border-radius: 8px; text-decoration: none; }
    .footer { background: #f7f7f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>frankSQUARE月次報告</h1>
      <h2>月報の確認が完了しました</h2>
      <span class="badge">✓ 確認済み</span>
    </div>
    <div class="body">
      <p class="message">
        ${memberName} さん、<br><br>
        ${monthLabel}の月次報告書を上司が確認しました。<br>
        引き続きよろしくお願いいたします。
      </p>
      <div class="meta">
        <span>👤 氏名：${memberName}</span>
        ${project ? `<span>🗂 プロジェクト：${project}</span>` : ""}
        <span>📅 報告月：${monthLabel}</span>
        <span>✅ ステータス：確認済み</span>
      </div>
      ${comment ? `
      <div style="background: #f0faf7; border-left: 3px solid #0f6e56; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px;">
        <p style="font-size: 12px; font-weight: bold; color: #0f6e56; margin: 0 0 6px;">確認者コメント</p>
        <p style="font-size: 14px; color: #333; margin: 0; white-space: pre-wrap;">${comment}</p>
      </div>` : ""}
      ${reportUrl ? `
      <div class="btn-wrap">
        <a href="${reportUrl}" class="btn">📄 報告書を確認する</a>
      </div>` : ""}
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
      subject: `【月次報告】${monthLabel}分の報告書が確認されました`,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}
