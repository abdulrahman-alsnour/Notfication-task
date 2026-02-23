"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type Recipient = { id: number; name: string; phone: string; email: string | null; scope: string };
type ScopesResponse = { scopes: { code: string; displayName: string }[] };

export default function EditRecipientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [scopes, setScopes] = useState<{ value: string; label: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/scopes").then((r) => r.json()),
      fetch(`/api/recipients/${id}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found")))),
    ])
      .then(([scopesData, recipientData]: [ScopesResponse, { recipient: Recipient }]) => {
        setScopes(scopesData.scopes.map((s) => ({ value: s.code, label: s.displayName })));
        const r = recipientData.recipient;
        setName(r.name);
        setPhone(r.phone);
        setEmail(r.email || "");
        setScope(r.scope);
      })
      .catch(() => setError("Recipient not found."))
      .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Name is required.";
    if (!phone.trim()) err.phone = "Phone is required.";
    if (!scope) err.scope = "Scope is required.";
    if (Object.keys(err).length) {
      setFieldErrors(err);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/recipients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() || null, scope }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update recipient.");
      return;
    }
    router.push("/recipients");
    router.refresh();
  };

  if (fetching) return <div className="p-6">Loading…</div>;
  if (error && !name) return <div className="p-6"><Alert variant="error">{error}</Alert><Link href="/recipients"><Button variant="secondary" className="mt-4">Back to recipients</Button></Link></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Edit recipient"
        description="Update contact details."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} required />
        <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select label="Scope" options={scopes} value={scope} onChange={(e) => setScope(e.target.value)} error={fieldErrors.scope} required />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
          <Link href="/recipients"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
