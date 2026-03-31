-- 経費申請（親テーブル：申請単位）
CREATE TABLE expense_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_reports_member_id ON expense_reports(member_id);
CREATE INDEX idx_expense_reports_month ON expense_reports(month);

-- 経費明細（子テーブル：明細単位）
CREATE TABLE expense_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  receipt_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_items_report_id ON expense_items(report_id);

-- Supabase Storage: receipts バケットをダッシュボードから作成してください
-- - バケット名: receipts
-- - Public: false
-- - Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
-- - Max file size: 5MB
