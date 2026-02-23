"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Template = { id: number; name: string; objectType: string; templateBody: string };

type ScopesResponse = { scopes: { code: string; displayName: string }[] };
type ListResponse = { templates: Template[]; total: number; page: number; totalPages: number };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
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

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (scopeFilter) params.set("scope", scopeFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    const res = await fetch(`/api/templates?${params}`);
    if (!res.ok) {
      setError("Failed to load templates.");
      setLoading(false);
      return;
    }
    const data: ListResponse = await res.json();
    setTemplates(data.templates);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    fetchScopes();
  }, []);

  useEffect(() => {
    fetchTemplates();
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
    const res = await fetch(`/api/templates/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete template.");
      return;
    }
    setSuccess("Template deleted.");
    setTimeout(() => setSuccess(null), 3000);
    fetchTemplates();
  };

  const previewBody = (body: string) => (body.length > 60 ? body.slice(0, 60) + "…" : body);

  return (
    <div className="p-6">
      <PageHeader
        title="Templates"
        description="Message blueprints with placeholders like {{name}}."
        action={
          <Link href="/templates/new">
            <Button>Create template</Button>
          </Link>
        }
      />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

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
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No templates found. Create one to get started.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Scope</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Preview</th>
                    <th className="px-4 py-3 font-semibold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900">{t.name}</td>
                      <td className="px-4 py-3 text-slate-600">{t.objectType}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{previewBody(t.templateBody)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/templates/${t.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">View</Link>
                        <Link href={`/templates/${t.id}/edit`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">Edit</Link>
                        <button type="button" onClick={() => setDeleteId(t.id)} className="text-red-600 hover:text-red-700 font-medium">Delete</button>
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

      <ConfirmModal open={deleteId !== null} title="Delete template" message="This will remove the template. Notifications that used it will not be affected." confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
