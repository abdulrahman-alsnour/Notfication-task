"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type Recipient = { id: number; name: string; phone: string; scope: string };
type ScopesResponse = { scopes: { code: string; displayName: string }[] };

export default function EditAudiencePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [scopes, setScopes] = useState<{ value: string; label: string }[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/scopes").then((r) => r.json()).then((data: ScopesResponse) => setScopes(data.scopes.map((s) => ({ value: s.code, label: s.displayName }))));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/audiences/${id}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found")))),
      fetch("/api/scopes").then((r) => r.json()),
    ])
      .then(([audienceData, scopesData]: [{ audience: { name: string; scope: string }; members: Recipient[] }, ScopesResponse]) => {
        const a = audienceData.audience;
        setName(a.name);
        setScope(a.scope);
        setSelectedIds(audienceData.members.map((m) => m.id));
        return scopesData;
      })
      .then((scopesData) => {
        setScopes(scopesData.scopes.map((s: { code: string; displayName: string }) => ({ value: s.code, label: s.displayName })));
      })
      .catch(() => setError("Audience not found."))
      .finally(() => setFetching(false));
  }, [id]);

  useEffect(() => {
    if (!scope) return;
    fetch(`/api/recipients?scope=${scope}&limit=500`).then((r) => r.json()).then((data) => setRecipients(data.recipients ?? []));
  }, [scope]);

  const toggleRecipient = (rid: number) => {
    setSelectedIds((prev) => (prev.includes(rid) ? prev.filter((x) => x !== rid) : [...prev, rid]));
  };

  const selectAll = () => setSelectedIds(recipients.map((r) => r.id));
  const selectNone = () => setSelectedIds([]);

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
    const res = await fetch(`/api/audiences/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scope, recipientIds: selectedIds }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update audience.");
      return;
    }
    router.push(`/audiences/${id}`);
    router.refresh();
  };

  if (fetching) return <div className="p-6">Loading…</div>;
  if (error && !name) return <div className="p-6"><Alert variant="error">{error}</Alert><Link href="/audiences"><Button variant="secondary" className="mt-4">Back to audiences</Button></Link></div>;

  return (
    <div className="p-6">
      <PageHeader title="Edit audience" description="Update audience name, scope, or members." />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} required />
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
              {recipients.map((r) => (
                <label key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleRecipient(r.id)} className="rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                  <span className="text-sm text-slate-700">{r.name} ({r.phone})</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{selectedIds.length} selected</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
          <Link href={`/audiences/${id}`}><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
