"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type User = {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
  createdAt: string;
};

type ListResponse = { users: User[]; total: number; page: number; totalPages: number };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/users?page=${page}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Forbidden" ? "You do not have permission to view users." : "Failed to load users.");
      setLoading(false);
      return;
    }
    const data: ListResponse = await res.json();
    setUsers(data.users);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete user.");
      return;
    }
    setError(null);
    fetchUsers();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Users"
        description="Manage who can log in to the app. Admin only."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No users found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Username</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Display name</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Role</th>
                    <th className="px-4 py-3 font-semibold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900">{u.username}</td>
                      <td className="px-4 py-3 text-slate-600">{u.displayName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email ?? "—"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-600"}`}>{u.role ?? "user"}</span></td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/users/${u.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">Edit</Link>
                        <button type="button" onClick={() => setDeleteId(u.id)} className="text-red-600 hover:text-red-700 font-medium">Delete</button>
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

      <ConfirmModal open={deleteId !== null} title="Delete user" message="This will remove the user from the system. They will no longer be able to log in." confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
