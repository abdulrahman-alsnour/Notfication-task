"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Stats = {
  notificationsByStatus: { sent: number; failed: number; awaiting_approval: number; rejected: number };
  scheduledByStatus: { pending: number; awaiting_approval: number; sent: number; cancelled: number; rejected: number };
  overTime: { day: string; sent: number; failed: number }[];
  totals: { recipients: number; audiences: number; templates: number };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError("Failed to load dashboard stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Dashboard" description="Overview of your notification hub." />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <PageHeader title="Dashboard" description="Overview of your notification hub." />
        {error && <Alert variant="error">{error}</Alert>}
      </div>
    );
  }

  const { notificationsByStatus, scheduledByStatus, overTime, totals } = stats;
  const maxChart = Math.max(1, ...overTime.flatMap((d) => [d.sent, d.failed]));

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-slate-50/80 to-white">
      <PageHeader
        title="Dashboard"
        description="Overview of your notification hub. Send messages, review history, and manage content."
        action={
          <Link href="/send">
            <Button>Send notification</Button>
          </Link>
        }
      />

      <div className="mt-8 space-y-8">
        {/* Notification status cards */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Notification history</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/notifications?status=sent" className="group">
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition shadow-emerald-100/50 group-hover:shadow-md group-hover:border-emerald-300">
                <p className="text-sm font-medium text-emerald-700">Sent</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900 tabular-nums">{notificationsByStatus.sent}</p>
              </div>
            </Link>
            <Link href="/notifications?status=failed" className="group">
              <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm transition shadow-red-100/50 group-hover:shadow-md group-hover:border-red-300">
                <p className="text-sm font-medium text-red-700">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-900 tabular-nums">{notificationsByStatus.failed}</p>
              </div>
            </Link>
            <Link href="/approval" className="group">
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition shadow-amber-100/50 group-hover:shadow-md group-hover:border-amber-300">
                <p className="text-sm font-medium text-amber-700">Awaiting approval</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 tabular-nums">{notificationsByStatus.awaiting_approval}</p>
              </div>
            </Link>
            <Link href="/notifications?status=rejected" className="group">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition group-hover:shadow-md group-hover:border-slate-300">
                <p className="text-sm font-medium text-slate-600">Rejected</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{notificationsByStatus.rejected}</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Scheduled status cards */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Scheduled</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Link href="/scheduled?status=pending" className="group">
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm transition group-hover:shadow-md group-hover:border-blue-300">
                <p className="text-xs font-medium text-blue-700">Pending</p>
                <p className="mt-0.5 text-xl font-bold text-blue-900 tabular-nums">{scheduledByStatus.pending}</p>
              </div>
            </Link>
            <Link href="/approval" className="group">
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm transition group-hover:shadow-md group-hover:border-amber-300">
                <p className="text-xs font-medium text-amber-700">Awaiting approval</p>
                <p className="mt-0.5 text-xl font-bold text-amber-900 tabular-nums">{scheduledByStatus.awaiting_approval}</p>
              </div>
            </Link>
            <Link href="/scheduled?status=sent" className="group">
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm transition group-hover:shadow-md group-hover:border-emerald-300">
                <p className="text-xs font-medium text-emerald-700">Sent</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-900 tabular-nums">{scheduledByStatus.sent}</p>
              </div>
            </Link>
            <Link href="/scheduled?status=cancelled" className="group">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition group-hover:shadow-md group-hover:border-slate-300">
                <p className="text-xs font-medium text-slate-600">Cancelled</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{scheduledByStatus.cancelled}</p>
              </div>
            </Link>
            <Link href="/scheduled?status=rejected" className="group">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition group-hover:shadow-md group-hover:border-slate-300">
                <p className="text-xs font-medium text-slate-600">Rejected</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{scheduledByStatus.rejected}</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Chart: Sent vs failed over last 7 days */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sent vs failed (last 7 days)</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end gap-3 h-44">
              {overTime.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-32 flex gap-1 justify-center items-end">
                    <div
                      className="flex-1 max-w-[24px] rounded-t bg-emerald-500 transition hover:bg-emerald-600"
                      style={{ height: `${(d.sent / maxChart) * 100}%`, minHeight: d.sent ? 6 : 0 }}
                      title={`Sent: ${d.sent}`}
                    />
                    <div
                      className="flex-1 max-w-[24px] rounded-t bg-red-400 transition hover:bg-red-500"
                      style={{ height: `${(d.failed / maxChart) * 100}%`, minHeight: d.failed ? 6 : 0 }}
                      title={`Failed: ${d.failed}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(d.day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500" /> Sent
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-red-400" /> Failed
              </span>
            </div>
          </div>
        </section>

        {/* Optional: Totals */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <Link href="/recipients" className="group">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition group-hover:shadow-md group-hover:border-slate-300">
                <p className="text-sm font-medium text-slate-600">Recipients</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totals.recipients}</p>
              </div>
            </Link>
            <Link href="/audiences" className="group">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition group-hover:shadow-md group-hover:border-slate-300">
                <p className="text-sm font-medium text-slate-600">Audiences</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totals.audiences}</p>
              </div>
            </Link>
            <Link href="/templates" className="group">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition group-hover:shadow-md group-hover:border-slate-300">
                <p className="text-sm font-medium text-slate-600">Templates</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{totals.templates}</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Quick links */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Use <Link href="/send" className="font-medium text-slate-900 hover:underline">Send notification</Link> to send or schedule messages.
            View <Link href="/notifications" className="font-medium text-slate-900 hover:underline">History</Link> and{" "}
            <Link href="/scheduled" className="font-medium text-slate-900 hover:underline">Scheduled</Link> for past and upcoming sends.
            When approval is enabled, use <Link href="/approval" className="font-medium text-slate-900 hover:underline">Approval</Link> to approve or reject.
            Manage <Link href="/scopes" className="font-medium text-slate-900 hover:underline">Scopes</Link>,{" "}
            <Link href="/recipients" className="font-medium text-slate-900 hover:underline">Recipients</Link>,{" "}
            <Link href="/audiences" className="font-medium text-slate-900 hover:underline">Audiences</Link>, and{" "}
            <Link href="/templates" className="font-medium text-slate-900 hover:underline">Templates</Link> from the sidebar.
          </p>
        </section>
      </div>
    </div>
  );
}
