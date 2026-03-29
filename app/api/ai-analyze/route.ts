import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m)}月`;
}

export async function POST(request: Request) {
  // 最高権限ユーザーのみ許可
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await request.json();
  const { currentReport, previousReports } = body;

  if (!currentReport) {
    return NextResponse.json({ error: "currentReport は必須です" }, { status: 400 });
  }

  const currentMonthLabel = formatMonth(currentReport.month);

  let analysis = "";

  if (!previousReports || previousReports.length === 0) {
    analysis = "過去の報告書がないため、比較分析はできません。来月以降、蓄積されたデータをもとに分析します。";
  } else {
    const previousSummary = previousReports
      .slice(0, 6)
      .map((r: { month: string; learnings?: string; issues?: string; achievements?: string; next_month?: string }) => `
【${formatMonth(r.month)}】
・課題・問題: ${r.issues || "なし"}
・学んだこと・気づき・反省点: ${r.learnings || "なし"}
・成果: ${r.achievements || "なし"}
・来月の目標: ${r.next_month || "なし"}
      `.trim())
      .join("\n\n");

    const prompt = `あなたはSESエンジニアのキャリアアドバイザーです。
以下のエンジニアの月次報告書を分析し、改善に向けた具体的なアドバイスを提供してください。

## 今月（${currentMonthLabel}）の報告内容
・課題・問題: ${currentReport.issues || "なし"}
・学んだこと・気づき・反省点: ${currentReport.learnings || "なし"}
・成果・達成事項: ${currentReport.achievements || "なし"}
・来月の目標: ${currentReport.next_month || "なし"}

## 過去の報告内容（直近${previousReports.slice(0, 6).length}ヶ月）
${previousSummary}

## 分析してほしいこと
1. **繰り返しパターンの検出**: 同じ課題や反省点が複数月にわたって繰り返されていないか
2. **改善の確認**: 過去に掲げた目標や反省が今月活かされているか
3. **成長の確認**: 良い変化や成長が見られる点

## 出力形式
以下の3つのセクションで回答してください。各セクションは箇条書きで2〜4点ずつ。全体で300字以内。

### ⚠️ 注意・繰り返しパターン
（同じ課題や反省が繰り返されている場合のみ記載。なければ「特になし」）

### 💡 改善アドバイス
（具体的な改善アクションを提案）

### ✅ 良い点・成長
（前月からの改善や成長を認める）`;

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    analysis = textBlock && textBlock.type === "text" ? textBlock.text : "";
  }

  // 分析結果をDBに保存
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("reports")
    .update({ ai_analysis: analysis })
    .eq("id", currentReport.id);

  return NextResponse.json({ analysis });
}
