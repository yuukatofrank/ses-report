import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();
  const { report } = body;

  if (!report) {
    return NextResponse.json({ error: "報告書データがありません" }, { status: 400 });
  }

  const prompt = `以下のSESエンジニアの月次報告書を分析してください。
以下の3つの観点で、具体的かつ建設的なフィードバックを日本語で出力してください。
各セクションは必ず記載し、箇条書きで3〜5点ずつ挙げてください。

---
【報告月】${report.month}
【業務・タスク】${report.works || "（未記入）"}
【成果・達成事項】${report.achievements || "（未記入）"}
【発生した課題・トラブル】${report.issues || "（未記入）"}
【学んだこと・気づき】${report.learnings || "（未記入）"}
【来月の目標】${report.next_month || "（未記入）"}
---

以下のJSON形式で出力してください（マークダウンや説明文は不要、JSONのみ）:
{
  "issues": ["課題・問題点1", "課題・問題点2", ...],
  "improvements": ["改善提案1", "改善提案2", ...],
  "growth": ["成長・プラスのポイント1", "成長・プラスのポイント2", ...]
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "{}";

  try {
    // コードブロック（```json ... ```）が含まれる場合は除去
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    // DBに保存
    const supabase = createSupabaseAdminClient();
    await supabase.from("reports").update({ ai_insight: result }).eq("id", report.id);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: `分析結果の解析に失敗しました: ${text.slice(0, 100)}` }, { status: 500 });
  }
}
