"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

type Scheduled = {
  id: number;
  title: string;
  objectType: string;
  templateId: number;
  recipientCount: number;
  messageType: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
  sentAt: string | null;
  template?: { name: string } | null;
};

export default function ScheduledNotificationsPage() {
  const [list, setList] = useState<Scheduled[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [messageTypeFilter, setMessageTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchList = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (statusFilter) params.set("status", statusFilter);
    if (messageTypeFilter) params.set("messageType", messageTypeFilter);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    fetch(`/api/scheduled-notifications?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setList(data.scheduledNotifications ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch(() => setError("Failed to load scheduled notifications."))
      .finally(() => setLoading(false));
  };

  const processDueNow = () => {
    fetch("/api/notifications/process-scheduled")
      .then(() => fetchList())
      .catch(() => {});
  };

  useEffect(() => {
    processDueNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, messageTypeFilter, fromDate, toDate]);

  const handleCancel = async () => {
    if (!actionId) return;
    setSubmitting(true);
    const res = await fetch(`/api/scheduled-notifications/${actionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    setActionId(null);
    if (!res.ok) {
      setError(data.error || "Action failed.");
      return;
    }
    setError(null);
    setSuccess(data.message || "Done.");
    setTimeout(() => setSuccess(null), 3000);
    fetchList();
  };

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "awaiting_approval", label: "Awaiting approval" },
    { value: "sent", label: "Sent" },
    { value: "cancelled", label: "Cancelled" },
    { value: "rejected", label: "Rejected" },
  ];
  const messageTypeOptions = [
    { value: "", label: "All types" },
    { value: "sms", label: "SMS" },
    { value: "whatsapp", label: "WhatsApp" },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Scheduled notifications"
        description="View and manage scheduled sends. Due notifications are sent automatically; use « Process due now » to run the job immediately."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={processDueNow}>
              Process due now
            </Button>
            <Link href="/send">
              <Button>Send notification</Button>
            </Link>
          </div>
        }
      />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Select
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-48">
          <Select
            label="Message type"
            options={messageTypeOptions}
            value={messageTypeFilter}
            onChange={(e) => { setMessageTypeFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled from</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled to</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No scheduled notifications.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-900">Title</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Template</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Scheduled at</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Recipients</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{n.title}</td>
                      <td className="px-4 py-3 text-slate-600">{n.messageType === "whatsapp" ? "WhatsApp" : n.messageType === "sms" ? "SMS" : n.messageType}</td>
                      <td className="px-4 py-3 text-slate-600">{n.template?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(n.scheduledAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{n.recipientCount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          n.status === "sent" ? "bg-green-100 text-green-800" :
                          n.status === "pending" ? "bg-blue-100 text-blue-800" :
                          n.status === "awaiting_approval" ? "bg-amber-100 text-amber-800" :
                          n.status === "cancelled" || n.status === "rejected" ? "bg-slate-100 text-slate-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {n.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/scheduled/${n.id}`} className="text-slate-600 hover:text-slate-900 font-medium mr-3">View</Link>
                        {n.status === "pending" && (
                          <button type="button" onClick={() => setActionId(n.id)} className="text-red-600 hover:text-red-700 font-medium">Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-600">Page {page} of {totalPages} ({total} total)</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={actionId !== null}
        title="Cancel scheduled notification"
        message="This scheduled notification will not be sent. Continue?"
        confirmLabel="Cancel"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setActionId(null)}
        loading={submitting}
      />
    </div>
  );
}
