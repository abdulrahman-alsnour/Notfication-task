"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Entry = {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export default function AuditPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/audit?page=${page}`)
      .then((r) => {
        if (r.status === 403) {
          setForbidden(true);
          return { entries: [], total: 0, totalPages: 1 };
        }
        if (!r.ok) throw new Error("Failed to load audit log");
        return r.json();
      })
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setError(null);
      })
      .catch((e) => {
        if (!forbidden) setError(e?.message ?? "Failed to load audit log.");
      })
      .finally(() => setLoading(false));
  }, [page, forbidden]);

  if (forbidden) {
    return (
      <div className="p-6">
        <PageHeader title="Audit trail" description="View who did what and when." />
        <Alert variant="error">Only admins can view the audit trail.</Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Audit trail"
        description="Who did what and when. Create, update, delete, send, approve, and reject actions are logged."
      />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audit entries yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">When</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">User</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Action</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Entity</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">ID</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{e.username ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          e.action === "create" ? "bg-emerald-100 text-emerald-800" :
                          e.action === "update" ? "bg-blue-100 text-blue-800" :
                          e.action === "delete" ? "bg-red-100 text-red-800" :
                          e.action === "send" ? "bg-slate-100 text-slate-800" :
                          e.action === "approve" ? "bg-green-100 text-green-800" :
                          e.action === "reject" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.entityType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{e.entityId ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {e.details && Object.keys(e.details).length > 0 ? (
                          <span title={JSON.stringify(e.details)}>{JSON.stringify(e.details)}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-600">Page {page} of {totalPages} ({total} total)</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
