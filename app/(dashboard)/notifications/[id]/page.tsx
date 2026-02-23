"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Notification = {
  id: number;
  title: string;
  objectType: string;
  templateId: number;
  recipientCount: number;
  messageType: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  rejectionReason: string | null;
};
type Template = { name: string; templateBody: string } | null;
type Audience = { name: string; scope: string } | null;

export default function NotificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [notification, setNotification] = useState<Notification | null>(null);
  const [template, setTemplate] = useState<Template>(null);
  const [audience, setAudience] = useState<Audience>(null);
  const [members, setMembers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/notifications/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setNotification(data.notification);
        setTemplate(data.template);
        setAudience(data.audience);
        setMembers(data.members ?? []);
      })
      .catch(() => setError("Notification not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error || !notification) return <div className="p-6"><Alert variant="error">{error || "Not found."}</Alert><Link href="/notifications"><Button variant="secondary" className="mt-4">Back to history</Button></Link></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={notification.title}
        description={`${notification.objectType} • ${notification.recipientCount} recipient(s) • ${notification.status.replace(/_/g, " ")}`}
        action={
          <Link href="/notifications">
            <Button variant="secondary">Back to history</Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div><span className="text-sm font-medium text-slate-500">Template</span><p className="mt-0.5 text-slate-900">{template?.name ?? "—"}</p></div>
        <div><span className="text-sm font-medium text-slate-500">Audience</span><p className="mt-0.5 text-slate-900">{audience?.name ?? "—"}</p></div>
        <div><span className="text-sm font-medium text-slate-500">Message type</span><p className="mt-0.5 text-slate-900">{notification.messageType}</p></div>
        <div><span className="text-sm font-medium text-slate-500">Created</span><p className="mt-0.5 text-slate-900">{new Date(notification.createdAt).toLocaleString()}</p></div>
        {notification.sentAt && <div><span className="text-sm font-medium text-slate-500">Sent at</span><p className="mt-0.5 text-slate-900">{new Date(notification.sentAt).toLocaleString()}</p></div>}
        {notification.rejectionReason && <div><span className="text-sm font-medium text-slate-500">Rejection reason</span><p className="mt-0.5 text-slate-900">{notification.rejectionReason}</p></div>}
      </div>

      {template && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Template body</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-600 font-sans">{template.templateBody}</pre>
        </div>
      )}

      {members.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
            <h2 className="text-sm font-semibold text-slate-900">Recipients ({members.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-900">Name</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(members as { name: string; phone: string }[]).map((m, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-slate-900">{m.name}</td>
                    <td className="px-4 py-2 text-slate-600">{m.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
