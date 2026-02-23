"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Recipient = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  scope: string;
  metadata: unknown;
};

type ScopesResponse = { scopes: { code: string; displayName: string }[] };
type ListResponse = { recipients: Recipient[]; total: number; page: number; totalPages: number };

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [scopes, setScopes] = useState<{ value: string; label: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scopeFilter, setScopeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchScopes = async () => {
    const res = await fetch("/api/scopes");
    if (!res.ok) return;
    const data: ScopesResponse = await res.json();
    setScopes(data.scopes.map((s) => ({ value: s.code, label: s.displayName })));
  };

  const fetchRecipients = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (scopeFilter) params.set("scope", scopeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    const res = await fetch(`/api/recipients?${params}`);
    if (!res.ok) {
      setError("Failed to load recipients.");
      setLoading(false);
      return;
    }
    const data: ListResponse = await res.json();
    setRecipients(data.recipients);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    fetchScopes();
  }, []);

  useEffect(() => {
    fetchRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, scopeFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/recipients/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete recipient.");
      return;
    }
    setSuccess("Recipient deleted.");
    setTimeout(() => setSuccess(null), 3000);
    fetchRecipients();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Recipients"
        description="Manage contacts who can receive notifications."
        action={
          <Link href="/recipients/new">
            <Button>Add recipient</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2">
          <Input
            label="Search"
            placeholder="Name or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-w-[180px]"
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <div className="min-w-[140px]">
          <Select
            label="Scope"
            options={scopes}
            value={scopeFilter}
            onChange={(e) => {
              setScopeFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : recipients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No recipients found. Add one to get started.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Phone</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Scope</th>
                    <th className="px-4 py-3 font-semibold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipients.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{r.scope}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/recipients/${r.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(r.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Showing page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Previous
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={deleteId !== null}
        title="Delete recipient"
        message="This will remove the recipient from all audiences. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
