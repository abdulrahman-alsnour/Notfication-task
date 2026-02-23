"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNav = [
  { href: "/", label: "Dashboard" },
  { href: "/send", label: "Send notification" },
  { href: "/notifications", label: "History" },
  { href: "/scheduled", label: "Scheduled" },
  { href: "/approval", label: "Approval", badgeKey: "approval" as const },
  { href: "/scopes", label: "Scopes" },
  { href: "/recipients", label: "Recipients" },
  { href: "/audiences", label: "Audiences" },
  { href: "/templates", label: "Templates" },
  { href: "/users", label: "Users" },
  { href: "/settings", label: "Settings" },
];
const auditNavItem = { href: "/audit", label: "Audit" };

export function Sidebar() {
  const pathname = usePathname();
  const [approvalCount, setApprovalCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/pending-approval-count")
      .then((r) => r.ok ? r.json() : { count: 0 })
      .then((data) => setApprovalCount(data?.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : { user: null })
      .then((data) => setIsAdmin(data?.user?.role === "admin"))
      .catch(() => {});
  }, []);

  const nav = isAdmin ? [...baseNav, auditNavItem] : baseNav;

  return (
    <aside className="fixed left-0 top-0 z-10 h-screen w-56 border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Notification Hub
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {nav.map((item) => {
          const href = item.href;
          const label = item.label;
          const badgeKey = "badgeKey" in item ? item.badgeKey : undefined;
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          const showBadge = badgeKey === "approval" && approvalCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-between gap-2 " +
                (isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
              }
            >
              <span>{label}</span>
              {showBadge && (
                <span className="min-w-[1.25rem] rounded-full bg-amber-500 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                  {approvalCount > 99 ? "99+" : approvalCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
