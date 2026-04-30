// アプリの「デフォルト月」は前月（先月分の月報・経費を扱うことが多いため）
export function getDefaultMonth(): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}
