"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";

type ScopesResponse = { scopes: { code: string; displayName: string }[] };

export default function NewTemplatePage() {
  const router = useRouter();
  const [scopes, setScopes] = useState<{ value: string; label: string }[]>([]);
  const [name, setName] = useState("");
  const [objectType, setObjectType] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/scopes").then((r) => r.json()).then((data: ScopesResponse) => setScopes(data.scopes.map((s) => ({ value: s.code, label: s.displayName }))));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Name is required.";
    if (!objectType) err.objectType = "Scope is required.";
    if (!templateBody.trim()) err.templateBody = "Template body is required.";
    if (Object.keys(err).length) {
      setFieldErrors(err);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        objectType,
        templateBody: templateBody.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create template.");
      return;
    }
    router.push("/templates");
    router.refresh();
  };

  return (
    <div className="p-6">
      <PageHeader title="Create template" description="Create a message blueprint with placeholders like {{name}}." />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} required placeholder="e.g. Welcome" />
        <Select label="Scope (object type)" options={scopes} value={objectType} onChange={(e) => setObjectType(e.target.value)} error={fieldErrors.objectType} required />
        <Textarea label="Template body" value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} error={fieldErrors.templateBody} required placeholder="Hello {{name}}, welcome to the team." rows={5} />
        <p className="text-xs text-slate-500">Use placeholders like {"{{name}}"} that will be replaced when sending.</p>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create template"}</Button>
          <Link href="/templates"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
