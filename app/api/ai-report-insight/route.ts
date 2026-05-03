import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const { report } = body;

  if (!report) {
    return NextResponse.json({ error: "報告書データがありません" }, { status: 400 });
  }

  const prompt = `以下のSESエンジニアの月次報告書を分析し、submit_report_insight ツールで結果を提出してください。
各項目は具体的かつ建設的な内容で、3〜5点ずつ日本語で記載してください。

---
【報告月】${report.month}
【業務・タスク】${report.works || "（未記入）"}
【成果・達成事項】${report.achievements || "（未記入）"}
【発生した課題・トラブル】${report.issues || "（未記入）"}
【学んだこと・気づき】${report.learnings || "（未記入）"}
【来月の目標】${report.next_month || "（未記入）"}
---`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    tools: [
      {
        name: "submit_report_insight",
        description: "月次報告書の分析結果を提出する",
        input_schema: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: { type: "string" },
              description: "課題・問題点（3〜5点）",
            },
            improvements: {
              type: "array",
              items: { type: "string" },
              description: "改善提案（3〜5点）",
            },
            growth: {
              type: "array",
              items: { type: "string" },
              description: "成長・プラスのポイント（3〜5点）",
            },
          },
          required: ["issues", "improvements", "growth"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_report_insight" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUseBlock = message.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    console.error("[ai-report-insight] tool_use block not found", {
      stop_reason: message.stop_reason,
      content_types: message.content.map((b) => b.type),
    });
    return NextResponse.json(
      { error: `分析結果を取得できませんでした (stop_reason: ${message.stop_reason})` },
      { status: 500 }
    );
  }

  const result = toolUseBlock.input as {
    issues: string[];
    improvements: string[];
    growth: string[];
  };

  const supabase = createSupabaseAdminClient();
  await supabase.from("reports").update({ ai_insight: result }).eq("id", report.id);

  return NextResponse.json(result);
}
