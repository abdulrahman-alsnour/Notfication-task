"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type Recipient = { id: number; name: string; phone: string; scope: string };
type ScopesResponse = { scopes: { code: string; displayName: string }[] };

export default function NewAudiencePage() {
  const router = useRouter();
  const [scopes, setScopes] = useState<{ value: string; label: string }[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/scopes").then((r) => r.json()).then((data: ScopesResponse) => setScopes(data.scopes.map((s) => ({ value: s.code, label: s.displayName }))));
  }, []);

  useEffect(() => {
    if (!scope) {
      setRecipients([]);
      setSelectedIds([]);
      return;
    }
    fetch(`/api/recipients?scope=${scope}&limit=500`).then((r) => r.json()).then((data) => {
      setRecipients(data.recipients ?? []);
      setSelectedIds([]);
    });
  }, [scope]);

  const toggleRecipient = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedIds(recipients.map((r) => r.id));
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Name is required.";
    if (!scope) err.scope = "Scope is required.";
    if (Object.keys(err).length) {
      setFieldErrors(err);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/audiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scope, recipientIds: selectedIds }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create audience.");
      return;
    }
    router.push("/audiences");
    router.refresh();
  };

  return (
    <div className="p-6">
      <PageHeader title="Create audience" description="Create a new group of recipients for bulk messaging." />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} required placeholder="e.g. All Employees" />
        <Select label="Scope" options={scopes} value={scope} onChange={(e) => setScope(e.target.value)} error={fieldErrors.scope} required />

        {scope && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Select recipients</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-slate-600 hover:text-slate-900">Select all</button>
                <span className="text-slate-400">|</span>
                <button type="button" onClick={selectNone} className="text-xs text-slate-600 hover:text-slate-900">Select none</button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1">
              {recipients.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">No recipients in this scope. Add recipients first.</p>
              ) : (
                recipients.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleRecipient(r.id)} className="rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                    <span className="text-sm text-slate-700">{r.name} ({r.phone})</span>
                  </label>
                ))
              )}
            </div>
            {recipients.length > 0 && <p className="mt-1 text-xs text-slate-500">{selectedIds.length} selected</p>}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create audience"}</Button>
          <Link href="/audiences"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
