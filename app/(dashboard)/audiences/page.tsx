"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Audience = { id: number; name: string; scope: string; memberCount?: number };

type ScopesResponse = { scopes: { code: string; displayName: string }[] };
type ListResponse = { audiences: Audience[]; total: number; page: number; totalPages: number };

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
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

  const fetchAudiences = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (scopeFilter) params.set("scope", scopeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    const res = await fetch(`/api/audiences?${params}`);
    if (!res.ok) {
      setError("Failed to load audiences.");
      setLoading(false);
      return;
    }
    const data: ListResponse = await res.json();
    setAudiences(data.audiences);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    fetchScopes();
  }, []);

  useEffect(() => {
    fetchAudiences();
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
    const res = await fetch(`/api/audiences/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete audience.");
      return;
    }
    setSuccess("Audience deleted.");
    setTimeout(() => setSuccess(null), 3000);
    fetchAudiences();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Audiences"
        description="Manage saved groups of recipients for bulk messaging."
        action={
          <Link href="/audiences/new">
            <Button>Create audience</Button>
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
          <Input label="Search" placeholder="Name…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="min-w-[180px]" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <div className="min-w-[140px]">
          <Select label="Scope" options={scopes} value={scopeFilter} onChange={(e) => { setScopeFilter(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : audiences.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audiences found. Create one to get started.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Scope</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Members</th>
                    <th className="px-4 py-3 font-semibold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audiences.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900">{a.name}</td>
                      <td className="px-4 py-3 text-slate-600">{a.scope}</td>
                      <td className="px-4 py-3 text-slate-600">{a.memberCount ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/audiences/${a.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">View</Link>
                        <Link href={`/audiences/${a.id}/edit`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">Edit</Link>
                        <button type="button" onClick={() => setDeleteId(a.id)} className="text-red-600 hover:text-red-700 font-medium">Delete</button>
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
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal open={deleteId !== null} title="Delete audience" message="This will remove the audience. Recipients will not be deleted." confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
