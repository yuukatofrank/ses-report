# frankSQUARE 管理システム

SESエンジニア向けの月次報告・経費申請・請求書管理を統合した社内管理Webアプリです。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB**: Supabase (PostgreSQL + Auth + Storage)
- **AI分析**: Anthropic API (claude-opus-4-6)
- **メール**: Resend (カスタムドメイン franksquare.co.jp)
- **デプロイ**: Vercel (GitHub連携 + カスタムドメイン portal.franksquare.co.jp)

---

## 機能一覧

### 月次報告
- 月報の作成・編集・提出・確認・差し戻し
- AI分析（過去比較・レポート分析）※最高権限者のみ
- コメント機能
- メンバー別 / 月別ビュー

### 経費申請
- 複数明細の一括入力・一括申請
- 領収書アップロード（画像/PDF）
- 承認・差し戻し（最高権限者）
- メール通知（申請時→管理者、差し戻し時→申請者）
- 経費精算書PDF出力
- モバイル対応レイアウト

### 請求書管理
- 契約ベースの請求書作成
- PDF一括ダウンロード
- クライアント・契約管理

### ユーザー管理
- Supabase Auth（メール招待 + パスワード設定）
- 権限管理（最高権限者 / 一般メンバー）

---

## 権限モデル

| 権限 | 判定方法 | できること |
|------|---------|-----------|
| 最高権限者 | `NEXT_PUBLIC_ADMIN_EMAIL` と一致 | 全機能 + AI分析 + 承認/差し戻し + ユーザー招待 + 請求書管理 |
| 一般メンバー | 上記以外 | 月報・経費の作成/編集/提出 |

---

## 環境変数

| 変数名 | 説明 | サーバー/クライアント |
|--------|------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | クライアント |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | サーバー |
| `ANTHROPIC_API_KEY` | Anthropic API key | サーバー |
| `RESEND_API_KEY` | Resend API key | サーバー |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス | サーバー |
| `APP_URL` | アプリURL（招待メールのリンク用） | サーバー |
| `NEXT_PUBLIC_ADMIN_EMAIL` | 最高権限者のメールアドレス | クライアント |
| `NEXT_PUBLIC_APP_URL` | アプリURL（クライアント用） | クライアント |

---

## DBテーブル

| テーブル | 説明 |
|---------|------|
| `members` | メンバー情報 |
| `reports` | 月次報告 |
| `expense_reports` | 経費申請（親） |
| `expense_items` | 経費明細（子） |
| `clients` | クライアント |
| `contracts` | 契約 |
| `invoices` | 請求書 |

経費関連のSQLは `supabase_expenses.sql` を参照。

---

## API エンドポイント

### メンバー
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/members` | メンバー一覧 |
| POST | `/api/members` | メンバー追加 |
| DELETE | `/api/members/[id]` | メンバー削除 |
| GET | `/api/profile` | プロフィール取得 |

### 月次報告
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/reports` | 報告書一覧 |
| POST | `/api/reports` | 報告書作成 |
| GET/PUT/DELETE | `/api/reports/[id]` | 報告書操作 |
| POST | `/api/ai-analyze` | AI過去比較分析 |
| POST | `/api/ai-report-insight` | AIレポート分析 |

### 経費申請
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/expenses` | 経費一覧 |
| POST | `/api/expenses` | 経費作成 |
| GET/PUT/DELETE | `/api/expenses/[id]` | 経費操作 |
| POST | `/api/expenses/receipt` | 領収書アップロード |
| GET | `/api/expenses/receipt/download` | 領収書ダウンロード |
| POST | `/api/expenses/notify-submitted` | 申請通知メール |
| POST | `/api/expenses/notify-returned` | 差し戻し通知メール |

### 請求書
| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/api/invoices` | 請求書一覧/作成 |
| GET/PUT/DELETE | `/api/invoices/[id]` | 請求書操作 |
| GET/POST | `/api/clients` | クライアント |
| GET/POST | `/api/contracts` | 契約 |

### 管理
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/admin/invite` | ユーザー招待メール送信 |
| GET | `/api/admin/users` | ユーザー一覧 |
| DELETE | `/api/admin/users/[id]` | ユーザー削除 |

---

## ローカル起動

```bash
npm install
npm run dev
```

## デプロイ

```bash
# 通常（git push で自動デプロイ）
git push

# NEXT_PUBLIC_ 変数変更時（ビルドキャッシュをクリアして再ビルド）
vercel --prod
```
