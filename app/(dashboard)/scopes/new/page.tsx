"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

type Recipient = { id: number; name: string; phone: string; email?: string | null; scope: string };

export default function NewScopePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/recipients?limit=500")
      .then((r) => r.json())
      .then((data: { recipients: Recipient[] }) => setRecipients(data.recipients ?? []))
      .catch(() => setRecipients([]))
      .finally(() => setFetching(false));
  }, []);

  const toggleRecipient = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const err: Record<string, string> = {};
    if (!code.trim()) err.code = "Code is required.";
    if (!displayName.trim()) err.displayName = "Display name is required.";
    if (Object.keys(err).length) {
      setFieldErrors(err);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/scopes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), displayName: displayName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data.error === "Forbidden" ? "Only admins can create scopes." : data.error || "Failed to create scope.");
      return;
    }

    const newCode = (data.scope?.code ?? code.trim()) as string;
    const toUpdate = Array.from(selectedIds);
    for (const id of toUpdate) {
      const r = recipients.find((x) => x.id === id);
      if (!r) continue;
      await fetch(`/api/recipients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r.name,
          phone: r.phone,
          email: r.email ?? null,
          scope: newCode,
        }),
      });
    }

    setLoading(false);
    router.push("/scopes");
    router.refresh();
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Create scope" description="Add a new object type and optionally assign recipients to it." />

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} error={fieldErrors.code} required placeholder="e.g. Employee" />
          <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={fieldErrors.displayName} required placeholder="e.g. Employee" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
            <h2 className="text-sm font-semibold text-slate-900">Add recipients to this scope</h2>
            <p className="mt-0.5 text-xs text-slate-500">Optionally select recipients to move to the new scope.</p>
          </div>
          {fetching ? (
            <div className="p-6 text-center text-slate-500">Loading recipients…</div>
          ) : recipients.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No recipients found. Add recipients from the Recipients page first.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="w-10 px-4 py-2" />
                    <th className="px-4 py-2 font-medium text-slate-900">Name</th>
                    <th className="px-4 py-2 font-medium text-slate-900">Phone</th>
                    <th className="px-4 py-2 font-medium text-slate-900">Current scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipients.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleRecipient(r.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-slate-900">{r.name}</td>
                      <td className="px-4 py-2 text-slate-600">{r.phone}</td>
                      <td className="px-4 py-2 text-slate-500">{r.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create scope"}</Button>
          <Link href="/scopes"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
