"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Scope = { id: number; code: string; displayName: string; icon: string | null };

export default function ScopesPage() {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchScopes = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/scopes");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Forbidden" ? "Only admins can manage scopes." : "Failed to load scopes.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setScopes(data.scopes ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchScopes();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/scopes/${deleteId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      setError(data.error || "Failed to delete scope.");
      return;
    }
    setSuccess("Scope deleted.");
    setTimeout(() => setSuccess(null), 3000);
    fetchScopes();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Scopes"
        description="Manage object types (e.g. Employee, Customer). Recipients and templates use scopes. Admin only."
        action={
          <Link href="/scopes/new">
            <Button>Create scope</Button>
          </Link>
        }
      />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : scopes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No scopes found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-900">Code</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Display name</th>
                  <th className="px-4 py-3 font-semibold text-slate-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.code}</td>
                    <td className="px-4 py-3 text-slate-600">{s.displayName}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/scopes/${s.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">View</Link>
                      <Link href={`/scopes/${s.id}/edit`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">Edit</Link>
                      <button type="button" onClick={() => setDeleteId(s.id)} className="text-red-600 hover:text-red-700 font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal open={deleteId !== null} title="Delete scope" message="Recipients using this scope must be reassigned or removed first. Continue?" confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
