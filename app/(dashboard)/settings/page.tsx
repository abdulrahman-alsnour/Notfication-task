"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";

type Settings = {
  scopeMappings: Record<string, { phone?: string; name?: string }>;
  approvalEnabled: boolean;
};

type Scope = { id: number; code: string; displayName: string };

const DEFAULT_PHONE = "phone";
const DEFAULT_NAME = "name";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [approvalEnabled, setApprovalEnabled] = useState(false);
  const [scopeMappings, setScopeMappings] = useState<Record<string, { phone: string; name: string }>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/scopes").then((r) => r.json()),
    ])
      .then(([settingsData, scopesData]) => {
        const s = settingsData.settings as Settings | undefined;
        setSettings(s ?? null);
        setApprovalEnabled(s?.approvalEnabled ?? false);

        const mappings: Record<string, { phone: string; name: string }> = {};
        (scopesData.scopes as Scope[] || []).forEach((scope) => {
          mappings[scope.code] = {
            phone: s?.scopeMappings?.[scope.code]?.phone ?? DEFAULT_PHONE,
            name: s?.scopeMappings?.[scope.code]?.name ?? DEFAULT_NAME,
          };
        });
        setScopeMappings(mappings);
        setScopes(scopesData.scopes ?? []);
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const payload = {
      approvalEnabled,
      scopeMappings: Object.fromEntries(
        Object.entries(scopeMappings).map(([code, m]) => [code, { phone: m.phone.trim() || undefined, name: m.name.trim() || undefined }])
      ),
    };
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Forbidden" ? "Only admins can change settings." : "Failed to save settings.");
      return;
    }
    const data = await res.json();
    setSettings(data.settings);
    setApprovalEnabled(data.settings.approvalEnabled);
    setSuccess("Settings saved.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const updateMapping = (code: string, field: "phone" | "name", value: string) => {
    setScopeMappings((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));
  };

  if (fetching) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6">
      <PageHeader title="Settings" description="System-wide configuration. Admin only." />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {success && <div className="mb-4"><Alert variant="success">{success}</Alert></div>}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Approval workflow</h2>
            <p className="mt-0.5 text-sm text-slate-500">When enabled, notifications must be approved before they are sent.</p>
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={approvalEnabled}
                onChange={(e) => setApprovalEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span className="text-sm font-medium text-slate-700">Require approval for notifications</span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Scope mappings</h2>
            <p className="mt-0.5 text-sm text-slate-500">Map which recipient fields are used for phone and name per scope (e.g. for template placeholders and sending).</p>
          </div>
          {scopes.length === 0 ? (
            <p className="text-sm text-slate-500">No scopes defined. Create scopes first from the Scopes page.</p>
          ) : (
            <div className="space-y-4">
              {scopes.map((scope) => (
                <div key={scope.code} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-900">{scope.displayName} ({scope.code})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Phone field"
                      value={scopeMappings[scope.code]?.phone ?? DEFAULT_PHONE}
                      onChange={(e) => updateMapping(scope.code, "phone", e.target.value)}
                      placeholder="e.g. phone"
                    />
                    <Input
                      label="Name field"
                      value={scopeMappings[scope.code]?.name ?? DEFAULT_NAME}
                      onChange={(e) => updateMapping(scope.code, "name", e.target.value)}
                      placeholder="e.g. name"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-700">Current scope mappings (read-only)</h3>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(scopeMappings).map(([code, m]) => [code, { phone: m.phone || undefined, name: m.name || undefined }])
                ),
                null,
                2
              )}
            </pre>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save settings"}</Button>
        </div>
      </form>
    </div>
  );
}
