"use client";

import { Expense, EXPENSE_CATEGORIES } from "@/types";

interface ExpenseListProps {
  expenses: Expense[];
  selectedExpense: Expense | null;
  onSelectExpense: (expense: Expense) => void;
  onNewExpense: () => void;
}

function statusBadge(status: Expense["status"]) {
  const map = {
    draft: { bg: "bg-gray-200 text-gray-600", label: "下書き" },
    submitted: { bg: "bg-yellow-100 text-yellow-700", label: "申請中" },
    approved: { bg: "bg-green-100 text-green-700", label: "承認済み" },
    returned: { bg: "bg-red-100 text-red-700", label: "差し戻し" },
  } as const;
  const { bg, label } = map[status];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${bg}`}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ExpenseList({
  expenses,
  selectedExpense,
  onSelectExpense,
  onNewExpense,
}: ExpenseListProps) {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <aside className="fixed top-[56px] left-0 bottom-0 w-[260px] bg-white border-r border-gray-200 flex-col z-30 hidden md:flex">
      {/* New expense button */}
      <div className="p-3 border-b border-gray-100">
        <button onClick={onNewExpense} className="btn-primary w-full text-sm">
          + 新規申請
        </button>
      </div>

      {/* Expense list */}
      <div className="flex-1 overflow-y-auto">
        {expenses.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-10 px-4">
            経費申請がまだありません
          </p>
        ) : (
          <ul className="py-1">
            {sorted.map((expense) => (
              <li key={expense.id}>
                <button
                  onClick={() => onSelectExpense(expense)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                    ${selectedExpense?.id === expense.id ? "bg-[#f0faf7] border-l-2 border-l-[#0f6e56]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
                    {statusBadge(expense.status)}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {expense.title}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      {EXPENSE_CATEGORIES[expense.category]}
                    </span>
                    <span className="text-xs font-medium text-[#0f6e56]">
                      ¥{expense.amount.toLocaleString()}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
