-- 経費申請テーブル
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  month TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_member_id ON expenses(member_id);
CREATE INDEX idx_expenses_month ON expenses(month);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Supabase Storage: receipts バケットをダッシュボードから作成してください
-- - バケット名: receipts
-- - Public: false
-- - Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
-- - Max file size: 5MB
