"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type Audience = { id: number; name: string; scope: string; memberCount?: number };
type Template = { id: number; name: string; objectType: string; templateBody: string };

export default function SendNotificationPage() {
  const router = useRouter();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [title, setTitle] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [messageType, setMessageType] = useState<"sms" | "whatsapp">("sms");
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/audiences").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([aData, tData]) => {
      setAudiences(aData.audiences ?? []);
      setTemplates(tData.templates ?? []);
    });
  }, []);

  const selectedAudience = audiences.find((a) => String(a.id) === audienceId);
  const templatesForScope = selectedAudience
    ? templates.filter((t) => t.objectType === selectedAudience.scope)
    : templates;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!audienceId) {
      setError("Please select an audience.");
      return;
    }
    if (!templateId) {
      setError("Please select a template.");
      return;
    }
    if (schedule && !scheduledAt.trim()) {
      setError("Please choose a date and time for scheduling.");
      return;
    }
    if (schedule && new Date(scheduledAt) <= new Date()) {
      setError("Scheduled time must be in the future.");
      return;
    }

    setLoading(true);
    const body: Record<string, unknown> = {
      title: title.trim(),
      audienceId: parseInt(audienceId, 10),
      templateId: parseInt(templateId, 10),
      messageType,
    };
    if (schedule && scheduledAt) {
      body.schedule = true;
      body.scheduledAt = new Date(scheduledAt).toISOString();
    }
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to send notification.");
      return;
    }
    if (data.scheduled) {
      router.push("/scheduled");
    } else if (data.notification?.status === "awaiting_approval") {
      router.push("/approval");
    } else {
      router.push("/notifications");
    }
    router.refresh();
  };

  const audienceOptions = audiences.map((a) => ({
    value: String(a.id),
    label: `${a.name} (${a.scope})${a.memberCount != null ? ` — ${a.memberCount} recipients` : ""}`,
  }));
  const templateOptions = templatesForScope.map((t) => ({
    value: String(t.id),
    label: t.name,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Send notification"
        description="Choose an audience and template, then send now or schedule for later."
      />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Weekly reminder"
        />
        <Select
          label="Audience"
          options={[{ value: "", label: "Select an audience…" }, ...audienceOptions]}
          value={audienceId}
          onChange={(e) => {
            setAudienceId(e.target.value);
            setTemplateId("");
          }}
          required
        />
        <Select
          label="Template"
          options={[{ value: "", label: selectedAudience ? "Select a template…" : "Select an audience first" }, ...templateOptions]}
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
          disabled={!selectedAudience}
        />
        <Select
          label="Message type"
          options={[
            { value: "sms", label: "SMS" },
            { value: "whatsapp", label: "WhatsApp" },
          ]}
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as "sms" | "whatsapp")}
        />

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            <span className="text-sm font-medium text-slate-700">Schedule for later</span>
          </label>
          {schedule && (
            <div className="mt-2">
              <Input
                label="Date and time"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Sending…" : schedule ? "Schedule notification" : "Send now"}
          </Button>
        </div>
      </form>
    </div>
  );
}
