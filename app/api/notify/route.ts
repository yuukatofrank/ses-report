import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    supervisorEmails,
    memberName,
    month,
    project,
    role,
    works,
    achievements,
    issues,
    learnings,
    nextMonth,
    aiSummary,
    reportUrl,
  } = body;

  const toList: string[] = Array.isArray(supervisorEmails)
    ? supervisorEmails.filter(Boolean)
    : supervisorEmails
    ? [supervisorEmails]
    : [];

  if (toList.length === 0 || !memberName || !month) {
    return NextResponse.json(
      { error: "必須項目が不足しています" },
      { status: 400 }
    );
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
    .meta { background: #f7f7f5; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #555; }
    .meta span { display: block; margin-bottom: 4px; }
    .section { margin-bottom: 20px; }
    .section-label { font-size: 11px; font-weight: bold; color: #0f6e56; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .section-body { font-size: 14px; color: #444; line-height: 1.7; white-space: pre-wrap; }
    .ai-box { background: #f0faf7; border-left: 4px solid #0f6e56; border-radius: 0 8px 8px 0; padding: 16px 18px; margin-bottom: 24px; }
    .ai-label { font-size: 11px; font-weight: bold; color: #0f6e56; margin-bottom: 8px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 16px 0; }
    .footer { background: #f7f7f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>frankSQUARE月次報告</h1>
      <h2>${memberName}さんから月報が届きました</h2>
      <span class="badge">📋 ${monthLabel} 報告</span>
    </div>
    ${reportUrl ? `
    <div style="background:#0f6e56; padding: 12px 32px;">
      <a href="${reportUrl}" style="display:inline-block; background:#fff; color:#0f6e56; font-size:13px; font-weight:bold; padding:8px 20px; border-radius:6px; text-decoration:none;">
        📄 報告書を開く
      </a>
    </div>` : ""}
    <div class="body">
      <div class="meta">
        <span>👤 氏名：${memberName}</span>
        ${role ? `<span>💼 役割：${role}</span>` : ""}
        ${project ? `<span>🗂 プロジェクト：${project}</span>` : ""}
        <span>📅 報告月：${monthLabel}</span>
      </div>

      ${
        aiSummary
          ? `
      <div class="ai-box">
        <div class="ai-label">✨ AI整形サマリー</div>
        <div class="section-body">${aiSummary}</div>
      </div>`
          : ""
      }

      ${
        works
          ? `
      <div class="section">
        <div class="section-label">今月の業務・タスク</div>
        <div class="section-body">${works}</div>
      </div>
      <hr class="divider">`
          : ""
      }

      ${
        achievements
          ? `
      <div class="section">
        <div class="section-label">成果・達成事項</div>
        <div class="section-body">${achievements}</div>
      </div>
      <hr class="divider">`
          : ""
      }

      ${
        issues
          ? `
      <div class="section">
        <div class="section-label">発生した問題・トラブル</div>
        <div class="section-body">${issues}</div>
      </div>
      <hr class="divider">`
          : ""
      }

      ${
        learnings
          ? `
      <div class="section">
        <div class="section-label">学んだこと・気づき</div>
        <div class="section-body">${learnings}</div>
      </div>
      <hr class="divider">`
          : ""
      }

      ${
        nextMonth
          ? `
      <div class="section">
        <div class="section-label">来月の課題・目標</div>
        <div class="section-body">${nextMonth}</div>
      </div>`
          : ""
      }
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
      to: toList,
      subject: `【月次報告】${memberName}さん ${monthLabel}分`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json(
      { error: "メール送信に失敗しました" },
      { status: 500 }
    );
  }
}
