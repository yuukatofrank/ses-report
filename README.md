# SES月次報告システム

SESエンジニア向けチーム共有型の月次報告書作成・管理Webアプリです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **DB**: Supabase (PostgreSQL)
- **AI整形**: Anthropic API (claude-opus-4-6)
- **デプロイ**: Vercel

---

## 1. Supabase セットアップ

[Supabase](https://supabase.com) でプロジェクトを作成し、SQL Editorで以下を実行します。

```sql
-- メンバーテーブル
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  created_at timestamptz default now()
);

-- 月次報告テーブル
create table reports (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  month text not null,
  member_name text not null,
  project text,
  role text,
  works text,
  achievements text,
  issues text,
  learnings text,
  next_month text,
  ai_summary text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成します。

```bash
cp .env.local.example .env.local
```

Supabase の **Project Settings → API** から以下を取得して設定します：

| 変数名 | 取得場所 |
|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) |

---

## 3. ローカル起動

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

---

## 4. Vercel へのデプロイ

### 方法A: Vercel CLIで直接デプロイ

```bash
npm install -g vercel
vercel --prod
```

### 方法B: GitHub連携でCI/CDデプロイ

1. GitHubにリポジトリを作成してpush
2. [Vercel](https://vercel.com) でプロジェクトをインポート
3. **Environment Variables** に `.env.local` の3変数を設定
4. Deployボタンをクリック → 自動でビルド・デプロイ完了

---

## 5. チームへの共有

デプロイが完了したら、Vercelが発行したURL（例: `https://ses-report-xxx.vercel.app`）をチームメンバーに共有するだけで使用可能です。ログイン不要で即利用できます。

---

## 画面構成

| 画面 | 説明 |
|------|------|
| ヘッダー | メンバー選択・追加・削除 |
| サイドバー | 過去報告書一覧（選択中メンバーでフィルタ） |
| メインエリア | 報告書フォーム / 閲覧ビュー |

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/members` | メンバー一覧 |
| POST | `/api/members` | メンバー追加 |
| DELETE | `/api/members/[id]` | メンバー削除 |
| GET | `/api/reports` | 報告書一覧（?member_id=でフィルタ可） |
| POST | `/api/reports` | 報告書作成 |
| GET | `/api/reports/[id]` | 報告書取得 |
| PUT | `/api/reports/[id]` | 報告書更新 |
| DELETE | `/api/reports/[id]` | 報告書削除 |
| POST | `/api/ai-format` | AI整形（Anthropic API） |
