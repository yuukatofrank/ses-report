import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  const body = await request.json();
  const { reportId, commenterEmail, commenterName, commentContent } = body;

  if (!reportId || !commentContent) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  // 報告書からmember_idを取得
  const { data: report } = await supabase
    .from("reports")
    .select("member_id, member_name, month")
    .eq("id", reportId)
    .single();

  if (!report) {
    return NextResponse.json({ error: "報告書が見つかりません" }, { status: 404 });
  }

  // メンバーのメールアドレスを取得
  const { data: member } = await supabase
    .from("members")
    .select("email, name")
    .eq("id", report.member_id)
    .single();

  if (!member?.email) {
    // メールアドレス未登録の場合はスキップ
    return NextResponse.json({ success: true, skipped: true });
  }

  // 自分のコメントには通知しない
  if (member.email === commenterEmail) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const monthLabel = formatMonth(report.month);

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Kaku Gothic Pro', 'Yu Gothic', Meiryo, sans-serif; color: #333; margin: 0; padding: 0; background: #f7f7f5; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 14px; opacity: 0.8; }
    .header h2 { margin: 8px 0 0; font-size: 20px; font-weight: bold; }
    .body { padding: 28px 32px; }
    .comment-box { background: #f0faf7; border-left: 4px solid #0f6e56; border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 16px 0; }
    .meta { font-size: 12px; color: #888; margin-bottom: 8px; }
    .content { font-size: 14px; color: #333; line-height: 1.7; white-space: pre-wrap; }
    .footer { background: #f7f7f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>frankSQUARE月次報告</h1>
      <h2>💬 コメントが届きました</h2>
    </div>
    <div class="body">
      <p style="font-size:14px; color:#555;">
        <strong>${report.member_name}</strong>さんの<strong>${monthLabel}</strong>の月報にコメントが追加されました。
      </p>
      <div class="comment-box">
        <div class="meta">from: ${commenterEmail || commenterName || "不明"}</div>
        <div class="content">${commentContent}</div>
      </div>
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
      to: member.email,
      subject: `【月次報告】${monthLabel}の月報にコメントが届きました`,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("notify-comment error:", err);
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}
