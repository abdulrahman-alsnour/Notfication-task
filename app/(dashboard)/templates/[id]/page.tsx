"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Template = { id: number; name: string; objectType: string; templateBody: string };

export default function ViewTemplatePage() {
  const params = useParams();
  const id = params.id as string;
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: { template: Template }) => setTemplate(data.template))
      .catch(() => setError("Template not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error || !template) return <div className="p-6"><Alert variant="error">{error || "Template not found."}</Alert><Link href="/templates"><Button variant="secondary" className="mt-4">Back to templates</Button></Link></div>;

  return (
    <div className="p-6">
      <PageHeader
        title={template.name}
        description={`Scope: ${template.objectType}`}
        action={
          <Link href={`/templates/${id}/edit`}>
            <Button variant="secondary">Edit template</Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900">Template body</h2>
        </div>
        <div className="p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 bg-slate-50 rounded-lg p-4">{template.templateBody}</pre>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/templates">
          <Button variant="ghost">← Back to templates</Button>
        </Link>
      </div>
    </div>
  );
}
