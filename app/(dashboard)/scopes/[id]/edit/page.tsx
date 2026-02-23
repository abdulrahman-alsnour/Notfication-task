"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Scope = { id: number; code: string; displayName: string; icon: string | null };
type Recipient = { id: number; name: string; phone: string; email: string | null; scope: string };
type ScopeOption = { value: string; label: string };

export default function EditScopePage() {
  const params = useParams();
  const id = params.id as string;
  const [scope, setScope] = useState<Scope | null>(null);
  const [scopeRecipients, setScopeRecipients] = useState<Recipient[]>([]);
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([]);
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [allScopeOptions, setAllScopeOptions] = useState<ScopeOption[]>([]);
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [removeRecipientId, setRemoveRecipientId] = useState<number | null>(null);
  const [moveToScope, setMoveToScope] = useState("");
  const [removing, setRemoving] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [inScopeNameFilter, setInScopeNameFilter] = useState("");
  const [inScopePhoneFilter, setInScopePhoneFilter] = useState("");
  const [inScopeScopeFilter, setInScopeScopeFilter] = useState("");
  const [availableNameFilter, setAvailableNameFilter] = useState("");
  const [availablePhoneFilter, setAvailablePhoneFilter] = useState("");
  const [availableScopeFilter, setAvailableScopeFilter] = useState("");

  const fetchData = async () => {
    setFetching(true);
    try {
      const [scopeRes, scopesRes] = await Promise.all([
        fetch(`/api/scopes/${id}`),
        fetch("/api/scopes"),
      ]);
      if (!scopeRes.ok) throw new Error("Scope not found");
      if (!scopesRes.ok) throw new Error("Failed to load scopes");

      const scopeData = await scopeRes.json();
      const scopesData = await scopesRes.json();

      setScope(scopeData.scope);
      setScopeRecipients(scopeData.recipients ?? []);
      setAvailableRecipients(scopeData.availableRecipients ?? []);
      setCode(scopeData.scope.code);
      setDisplayName(scopeData.scope.displayName);
      const all = (scopesData.scopes ?? []).map((s: { code: string; displayName: string }) => ({
        value: s.code,
        label: s.displayName,
      }));
      setAllScopeOptions(all);
      const opts = all.filter((opt: ScopeOption) => opt.value !== scopeData.scope.code);
      setScopes(opts);
    } catch {
      setError("Scope not found or you do not have permission.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

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
    const res = await fetch(`/api/scopes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), displayName: displayName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error === "Forbidden" ? "Only admins can edit scopes." : data.error || "Failed to update scope.");
      return;
    }
    setScope((prev) => (prev ? { ...prev, code: code.trim(), displayName: displayName.trim() } : null));
  };

  const handleRemove = async () => {
    if (!removeRecipientId || !moveToScope || !scope) return;
    const r = scopeRecipients.find((x) => x.id === removeRecipientId);
    if (!r) return;
    setRemoving(true);
    const res = await fetch(`/api/recipients/${removeRecipientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: r.name,
        phone: r.phone,
        email: r.email ?? null,
        scope: moveToScope,
      }),
    });
    setRemoving(false);
    setRemoveRecipientId(null);
    setMoveToScope("");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to remove recipient from scope.");
      return;
    }
    setError(null);
    fetchData();
  };

  const filteredScopeRecipients = useMemo(() => {
    let list = scopeRecipients;
    if (inScopeNameFilter.trim()) {
      const term = inScopeNameFilter.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(term));
    }
    if (inScopePhoneFilter.trim()) {
      list = list.filter((r) => r.phone.includes(inScopePhoneFilter.trim()));
    }
    if (inScopeScopeFilter) {
      list = list.filter((r) => r.scope === inScopeScopeFilter);
    }
    return list;
  }, [scopeRecipients, inScopeNameFilter, inScopePhoneFilter, inScopeScopeFilter]);

  const filteredAvailableRecipients = useMemo(() => {
    let list = availableRecipients;
    if (availableNameFilter.trim()) {
      const term = availableNameFilter.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(term));
    }
    if (availablePhoneFilter.trim()) {
      list = list.filter((r) => r.phone.includes(availablePhoneFilter.trim()));
    }
    if (availableScopeFilter) {
      list = list.filter((r) => r.scope === availableScopeFilter);
    }
    return list;
  }, [availableRecipients, availableNameFilter, availablePhoneFilter, availableScopeFilter]);

  const handleAdd = async (recipientId: number) => {
    if (!scope) return;
    const r = availableRecipients.find((x) => x.id === recipientId);
    if (!r) return;
    setAdding(recipientId);
    const res = await fetch(`/api/recipients/${recipientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: r.name,
        phone: r.phone,
        email: r.email ?? null,
        scope: scope.code,
      }),
    });
    setAdding(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to add recipient to scope.");
      return;
    }
    setError(null);
    fetchData();
  };

  if (fetching) return <div className="p-6">Loading…</div>;
  if (error && !scope) return <div className="p-6"><Alert variant="error">{error}</Alert><Link href="/scopes"><Button variant="secondary" className="mt-4">Back to scopes</Button></Link></div>;

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Edit scope"
        description="Change the name and manage recipients in this scope."
        action={
          <div className="flex items-center gap-3">
            <Link href={`/scopes/${id}`}>
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" form="edit-scope-form" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <form id="edit-scope-form" onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} error={fieldErrors.code} required />
        <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={fieldErrors.displayName} required />
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900">Recipients in this scope</h2>
        </div>
        <div className="flex flex-wrap gap-4 p-4 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <Input label="Filter by name" placeholder="Search by name…" value={inScopeNameFilter} onChange={(e) => setInScopeNameFilter(e.target.value)} />
          </div>
          <div className="min-w-0 flex-1">
            <Input label="Filter by phone" placeholder="Search by phone…" value={inScopePhoneFilter} onChange={(e) => setInScopePhoneFilter(e.target.value)} />
          </div>
          {allScopeOptions.length > 0 && (
            <div className="min-w-0 flex-1">
              <Select label="Filter by scope" options={[{ value: "", label: "All scopes" }, ...allScopeOptions]} value={inScopeScopeFilter} onChange={(e) => setInScopeScopeFilter(e.target.value)} />
            </div>
          )}
        </div>
        {scopeRecipients.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No recipients. Add some below.</div>
        ) : filteredScopeRecipients.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No recipients match the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-900">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Phone</th>
                  <th className="px-4 py-3 font-medium text-slate-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScopeRecipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setRemoveRecipientId(r.id)} className="text-red-600 hover:text-red-700 font-medium">Remove from scope</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900">Add recipients to this scope</h2>
        </div>
        <div className="flex flex-wrap gap-4 p-4 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <Input label="Filter by name" placeholder="Search by name…" value={availableNameFilter} onChange={(e) => setAvailableNameFilter(e.target.value)} />
          </div>
          <div className="min-w-0 flex-1">
            <Input label="Filter by phone" placeholder="Search by phone…" value={availablePhoneFilter} onChange={(e) => setAvailablePhoneFilter(e.target.value)} />
          </div>
          {allScopeOptions.length > 0 && (
            <div className="min-w-0 flex-1">
              <Select label="Filter by scope" options={[{ value: "", label: "All scopes" }, ...allScopeOptions]} value={availableScopeFilter} onChange={(e) => setAvailableScopeFilter(e.target.value)} />
            </div>
          )}
        </div>
        {availableRecipients.length === 0 ? (
          <div className="p-6 text-center text-slate-500">All recipients are already in this scope.</div>
        ) : filteredAvailableRecipients.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No recipients match the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-900">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Phone</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Current scope</th>
                  <th className="px-4 py-3 font-medium text-slate-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAvailableRecipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{r.scope}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => handleAdd(r.id)} disabled={adding === r.id}>
                        {adding === r.id ? "Adding…" : "Add to scope"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <Link href={`/scopes/${id}`}>
          <Button variant="ghost">← Back to scope</Button>
        </Link>
      </div>

      <ConfirmModal
        open={removeRecipientId !== null}
        title="Remove recipient from scope"
        message={scopes.length === 0 ? "Cannot remove: this is the only scope. Create another scope first, then move recipients." : "Choose another scope to move this recipient to. Recipients must belong to a scope."}
        confirmLabel="Move"
        variant="primary"
        onConfirm={handleRemove}
        onCancel={() => { setRemoveRecipientId(null); setMoveToScope(""); }}
        loading={removing}
        confirmDisabled={!moveToScope || scopes.length === 0}
      >
        {removeRecipientId !== null && scopes.length > 0 && (
          <div className="mt-4">
            <Select
              label="Move to scope"
              options={scopes}
              value={moveToScope}
              onChange={(e) => setMoveToScope(e.target.value)}
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
