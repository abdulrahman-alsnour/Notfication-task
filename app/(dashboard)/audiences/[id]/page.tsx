"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Audience = { id: number; name: string; scope: string };
type Recipient = { id: number; name: string; phone: string; scope: string };

export default function ViewAudiencePage() {
  const params = useParams();
  const id = params.id as string;
  const [audience, setAudience] = useState<Audience | null>(null);
  const [members, setMembers] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/audiences/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: { audience: Audience; members: Recipient[] }) => {
        setAudience(data.audience);
        setMembers(data.members);
      })
      .catch(() => setError("Audience not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error || !audience) return <div className="p-6"><Alert variant="error">{error || "Audience not found."}</Alert><Link href="/audiences"><Button variant="secondary" className="mt-4">Back to audiences</Button></Link></div>;

  return (
    <div className="p-6">
      <PageHeader
        title={audience.name}
        description={`Scope: ${audience.scope} • ${members.length} member(s)`}
        action={
          <Link href={`/audiences/${id}/edit`}>
            <Button variant="secondary">Edit audience</Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900">Members</h2>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No members in this audience.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-900">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Phone</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{r.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link href="/audiences">
          <Button variant="ghost">← Back to audiences</Button>
        </Link>
      </div>
    </div>
  );
}
