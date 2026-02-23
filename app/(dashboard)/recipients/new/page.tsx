"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type ScopesResponse = { scopes: { code: string; displayName: string }[] };

function NewRecipientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopeParam = searchParams.get("scope");
  const [scopes, setScopes] = useState<{ value: string; label: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState(scopeParam || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/scopes")
      .then((r) => r.json())
      .then((data: ScopesResponse) => {
        setScopes(data.scopes.map((s) => ({ value: s.code, label: s.displayName })));
        if (scopeParam && data.scopes.some((s: { code: string }) => s.code === scopeParam)) setScope(scopeParam);
      });
  }, [scopeParam]);

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
    const res = await fetch("/api/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() || null, scope }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create recipient.");
      return;
    }
    router.push("/recipients");
    router.refresh();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Add recipient"
        description="Create a new contact who can receive notifications."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          required
          placeholder="e.g. Ahmad Mohammad"
        />
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fieldErrors.phone}
          required
          placeholder="e.g. +962791234567"
        />
        <Input
          label="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
        <Select
          label="Scope"
          options={scopes}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          error={fieldErrors.scope}
          required
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create recipient"}
          </Button>
          <Link href="/recipients">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewRecipientPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <NewRecipientForm />
    </Suspense>
  );
}
