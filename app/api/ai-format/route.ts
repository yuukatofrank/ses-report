import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();
  const { works, achievements, issues, learnings, nextMonth } = body;

  if (!works && !achievements && !issues && !learnings && !nextMonth) {
    return NextResponse.json(
      { error: "整形する内容がありません" },
      { status: 400 }
    );
  }

  const prompt = `以下のSESエンジニアの月次報告内容を、上司に提出できる丁寧で簡潔なビジネス文書にまとめてください。
箇条書きと段落を適切に使い、500字以内でまとめてください。

【業務・タスク】${works || "（未記入）"}
【成果・達成事項】${achievements || "（未記入）"}
【課題・障害】${issues || "（未記入）"}
【学んだこと】${learnings || "（未記入）"}
【来月の目標】${nextMonth || "（未記入）"}`;

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const finalMessage = await stream.finalMessage();
  const textBlock = finalMessage.content.find((b) => b.type === "text");
  const summary = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return NextResponse.json({ summary });
}
