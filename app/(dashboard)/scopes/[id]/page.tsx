"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";

type Scope = { id: number; code: string; displayName: string; icon: string | null };
type Recipient = { id: number; name: string; phone: string; scope: string };

export default function ViewScopePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [scope, setScope] = useState<Scope | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/scopes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: { scope: Scope; recipients: Recipient[] }) => {
        setScope(data.scope);
        setRecipients(data.recipients);
      })
      .catch(() => setError("Scope not found or you do not have permission."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/scopes")
      .then((r) => r.json())
      .then((data: { scopes: Scope[] }) => setScopes(data.scopes ?? []));
  }, []);

  useEffect(() => {
    setScopeFilter(id);
  }, [id]);

  useEffect(() => {
    if (scopeFilter && scopeFilter !== id) {
      router.push(`/scopes/${scopeFilter}`);
    }
  }, [scopeFilter, id, router]);

  const filteredRecipients = useMemo(() => {
    let list = recipients;
    if (nameFilter.trim()) {
      const term = nameFilter.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(term));
    }
    if (phoneFilter.trim()) {
      const term = phoneFilter.trim();
      list = list.filter((r) => r.phone.includes(term));
    }
    return list;
  }, [recipients, nameFilter, phoneFilter]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error || !scope) return <div className="p-6"><Alert variant="error">{error || "Scope not found."}</Alert><Link href="/scopes"><Button variant="secondary" className="mt-4">Back to scopes</Button></Link></div>;

  const scopeOptions = scopes.map((s) => ({ value: String(s.id), label: `${s.displayName} (${s.code})` }));

  return (
    <div className="p-6">
      <PageHeader
        title={scope.displayName}
        description={`Code: ${scope.code} • ${filteredRecipients.length} recipient(s)`}
        action={
          <Link href={`/scopes/${id}/edit`}>
            <Button variant="secondary">Edit scope</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-0 flex-1">
          <Input
            label="Filter by name"
            placeholder="Search by name…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            label="Filter by phone"
            placeholder="Search by phone…"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
          />
        </div>
        {scopeOptions.length > 0 && (
          <div className="min-w-0 flex-1">
            <Select
              label="Scope"
              options={scopeOptions}
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900">Recipients in this scope</h2>
        </div>
        {recipients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No recipients in this scope. Add recipients with this scope from the Recipients page.</div>
        ) : filteredRecipients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No recipients match the filters.</div>
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
                {filteredRecipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/recipients/${r.id}`} className="text-slate-600 hover:text-slate-900 font-medium">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link href="/scopes">
          <Button variant="ghost">← Back to scopes</Button>
        </Link>
      </div>
    </div>
  );
}
