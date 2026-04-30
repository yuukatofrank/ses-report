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
  const { memberName, month, itemCount, totalAmount, expenseUrl, noExpense } = body;

  if (!memberName || !month) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: "管理者メールが設定されていません" }, { status: 500 });
  }

  const monthLabel = formatMonth(month);
  const amountStr = (totalAmount ?? 0).toLocaleString("ja-JP");

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
    .badge { display: inline-block; background: #eab308; color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
    .body { padding: 28px 32px; }
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
      <h1>frankSQUARE経費申請</h1>
      <h2>${memberName}さんから${noExpense ? "「申請なし」報告" : "経費申請"}が届きました</h2>
      <span class="badge">${noExpense ? "📭" : "📋"} ${monthLabel}分</span>
    </div>
    <div class="body">
      <div class="meta">
        <span>👤 申請者：${memberName}</span>
        <span>📅 対象月：${monthLabel}</span>
        ${noExpense
          ? '<span>📭 該当月の経費申請はありません</span>'
          : `<span>📝 明細件数：${itemCount ?? 0}件</span>
        <span>💰 合計金額：¥${amountStr}</span>`}
      </div>
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
      to: adminEmail,
      subject: noExpense
        ? `【経費申請なし】${memberName}さん ${monthLabel}分`
        : `【経費申請】${memberName}さん ${monthLabel}分`,
      html,
    });

    if (error) {
      console.error("Expense notify error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Expense notify error:", err);
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}
