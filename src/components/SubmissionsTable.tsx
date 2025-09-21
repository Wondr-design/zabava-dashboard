import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { SubmissionRecord } from "@/types/dashboard";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export interface SubmissionsTableProps {
  submissions: SubmissionRecord[];
  isLoading?: boolean;
  onToggleVisited?: (submission: SubmissionRecord) => void;
  visitUpdating?: Record<string, boolean>;
  emptyState?: ReactNode;
}

export function SubmissionsTable({
  submissions,
  isLoading = false,
  onToggleVisited,
  visitUpdating = {},
  emptyState,
}: SubmissionsTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-slate-400">Loading submissions...</div>
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        {emptyState ?? "No submissions found"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-white/[0.04]">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
              Email
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
              Category
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
              Ticket
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
              People
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
              Total Price
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-300">
              Points
            </th>
            <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-slate-300">
              Status
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
              Visit
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-300">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-white/[0.02]">
          {submissions.map((sub, idx) => {
            const key = sub.email ?? String(idx);
            const isUpdating = Boolean(visitUpdating[key]);
            return (
              <tr
              key={key}
              className="transition hover:bg-white/[0.05]"
            >
              <td className="px-3 py-3 text-sm text-slate-100">{sub.email}</td>
              <td className="px-3 py-3 text-sm text-slate-200">
                {sub.Categories || "N/A"}
              </td>
              <td className="px-3 py-3 text-sm text-slate-200">
                {sub.ticket || "N/A"}
              </td>
              <td className="px-3 py-3 text-sm text-slate-200">
                {sub.numPeople || "N/A"}
              </td>
              <td className="px-3 py-3 text-sm text-right text-sky-200">
                ${sub.totalPrice || 0}
              </td>
              <td className="px-3 py-3 text-sm text-right text-emerald-200">
                {sub.estimatedPoints || 0}
              </td>
              <td className="px-3 py-3 text-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    sub.used
                      ? "bg-emerald-500/15 text-emerald-200"
                      : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  {sub.used ? "Used" : "Pending"}
                </span>
              </td>
              <td className="px-3 py-3 text-sm text-slate-300">
                <div className="flex flex-col gap-1">
                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      sub.visited
                        ? "bg-emerald-500/15 text-emerald-200"
                        : "bg-amber-400/15 text-amber-200"
                    }`}
                  >
                    {sub.visited ? "Visited" : "Unconfirmed"}
                  </span>
                  {sub.visitedAt ? (
                    <span className="text-xs text-slate-400">
                      {formatDate(sub.visitedAt)}
                    </span>
                  ) : null}
                  {onToggleVisited && !sub.visited ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-fit border-white/30 bg-white/80 text-slate-900 hover:bg-white"
                      onClick={() => onToggleVisited(sub)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Saving..." : "Mark visited"}
                    </Button>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-3 text-sm text-slate-300">
                {formatDate(sub.createdAt)}
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
