-- 既存テーブルを削除して再作成
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS contract_items CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- 得意先マスタ
CREATE TABLE clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 契約マスタ（クライアント × 案件名 × 作業者）
CREATE TABLE contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  project_name text NOT NULL,
  payment_month_offset integer NOT NULL DEFAULT 1,
  payment_day integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 契約明細テンプレート
-- 品名に {month}（例: BRMS設計・開発支援{month}） と
-- {worker}（例: 出向負担金{month}（{worker}）） を使えます
CREATE TABLE contract_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  unit_price integer NOT NULL,
  tax_exempt boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

-- 請求書
CREATE TABLE invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid REFERENCES contracts(id) NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  issue_date date NOT NULL,
  target_month text NOT NULL, -- "YYYY-MM" 例: "2026-01"
  payment_due_date date NOT NULL,
  memo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 請求明細（テンプレート展開済み + 追加項目）
CREATE TABLE invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  unit_price integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  tax_exempt boolean NOT NULL DEFAULT false,
  is_additional boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
