"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type Notification = {
  id: number;
  title: string;
  objectType: string;
  recipientCount: number;
  messageType: string;
  createdAt: string;
  template?: { name: string } | null;
};
type Scheduled = Notification & { scheduledAt: string };

export default function ApprovalPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvalId, setApprovalId] = useState<number | null>(null);
  const [approvalType, setApprovalType] = useState<"notification" | "scheduled">("notification");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectType, setRejectType] = useState<"notification" | "scheduled">("notification");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPending = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/notifications?status=awaiting_approval").then((r) => r.json()),
      fetch("/api/scheduled-notifications?status=awaiting_approval").then((r) => r.json()),
    ])
      .then(([nData, sData]) => {
        setNotifications(nData.notifications ?? []);
        setScheduled(sData.scheduledNotifications ?? []);
      })
      .catch(() => setError("Failed to load pending items."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data.user?.role === "admin"));
  }, []);

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async () => {
    if (approvalId === null) return;
    setSubmitting(true);
    const url = approvalType === "notification"
      ? `/api/notifications/${approvalId}/approve`
      : `/api/scheduled-notifications/${approvalId}`;
    const method = approvalType === "notification" ? "POST" : "PATCH";
    const body = approvalType === "scheduled" ? JSON.stringify({ action: "approve" }) : undefined;
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, ...(body ? { body } : {}) });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    setApprovalId(null);
    if (!res.ok) {
      setError(data.error || "Approval failed.");
      return;
    }
    setError(null);
    setSuccess(data.message || "Approved and sent.");
    setTimeout(() => setSuccess(null), 3000);
    fetchPending();
  };

  const handleReject = async () => {
    if (rejectId === null) return;
    setSubmitting(true);
    const url = rejectType === "notification"
      ? `/api/notifications/${rejectId}/reject`
      : `/api/scheduled-notifications/${rejectId}`;
    const res = await fetch(url, {
      method: rejectType === "notification" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rejectType === "scheduled" ? { action: "reject", reason: rejectReason } : { reason: rejectReason }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    setRejectId(null);
    setRejectReason("");
    if (!res.ok) {
      setError(data.error || "Reject failed.");
      return;
    }
    setError(null);
    setSuccess("Rejected.");
    setTimeout(() => setSuccess(null), 3000);
    fetchPending();
  };

  const pendingCount = notifications.length + scheduled.length;

  return (
    <div className="p-6">
      <PageHeader
        title="Approval"
        description={pendingCount === 0 ? "No notifications awaiting approval." : `${pendingCount} item(s) awaiting approval.`}
      />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}
      {!isAdmin && pendingCount > 0 && (
        <div className="mb-4"><Alert variant="error">Only admins can approve or reject notifications.</Alert></div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading…</div>
      ) : pendingCount === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          When approval is enabled in Settings, notifications and scheduled notifications will appear here for approval or rejection.
        </div>
      ) : (
        <div className="space-y-6">
          {notifications.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
                <h2 className="text-sm font-semibold text-slate-900">Notifications awaiting approval</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-900">Title</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Template</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Recipients</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Created</th>
                      <th className="px-4 py-3 font-medium text-slate-900 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <tr key={`n-${n.id}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{n.title}</td>
                        <td className="px-4 py-3 text-slate-600">{n.template?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{n.recipientCount}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(n.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/notifications/${n.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">View</Link>
                          {isAdmin && (
                            <>
                              <button type="button" onClick={() => { setApprovalId(n.id); setApprovalType("notification"); }} className="text-green-600 hover:text-green-700 font-medium mr-3">Approve</button>
                              <button type="button" onClick={() => { setRejectId(n.id); setRejectType("notification"); }} className="text-red-600 hover:text-red-700 font-medium">Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {scheduled.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
                <h2 className="text-sm font-semibold text-slate-900">Scheduled notifications awaiting approval</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-900">Title</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Type</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Template</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Scheduled at</th>
                      <th className="px-4 py-3 font-medium text-slate-900">Recipients</th>
                      <th className="px-4 py-3 font-medium text-slate-900 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheduled.map((s) => (
                      <tr key={`s-${s.id}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{s.title}</td>
                        <td className="px-4 py-3 text-slate-600">{s.messageType === "whatsapp" ? "WhatsApp" : s.messageType === "sms" ? "SMS" : s.messageType ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{s.template?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(s.scheduledAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{s.recipientCount}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/scheduled/${s.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">View</Link>
                          {isAdmin && (
                            <>
                              <button type="button" onClick={() => { setApprovalId(s.id); setApprovalType("scheduled"); }} className="text-green-600 hover:text-green-700 font-medium mr-3">Approve</button>
                              <button type="button" onClick={() => { setRejectId(s.id); setRejectType("scheduled"); }} className="text-red-600 hover:text-red-700 font-medium">Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={approvalId !== null}
        title="Approve and send"
        message="This notification will be sent immediately to all recipients. Continue?"
        confirmLabel="Approve & send"
        variant="primary"
        onConfirm={handleApprove}
        onCancel={() => setApprovalId(null)}
        loading={submitting}
      />

      <ConfirmModal
        open={rejectId !== null}
        title="Reject notification"
        message="This notification will not be sent. Continue?"
        confirmLabel="Reject"
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => { setRejectId(null); setRejectReason(""); }}
        loading={submitting}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Rejection reason (optional)</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            placeholder="e.g. Wrong audience"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
