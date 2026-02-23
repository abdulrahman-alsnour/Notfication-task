"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

type User = { id: number; username: string; displayName: string | null; email: string | null; role: string };

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Forbidden or not found");
        return r.json();
      })
      .then((data: { user: User }) => {
        const u = data.user;
        setUsername(u.username);
        setDisplayName(u.displayName || "");
        setEmail(u.email || "");
        setRole(u.role || "user");
      })
      .catch(() => setError("User not found or you do not have permission."))
      .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const err: Record<string, string> = {};
    if (newPassword && newPassword.length < 6) err.newPassword = "Password must be at least 6 characters.";
    if (Object.keys(err).length) {
      setFieldErrors(err);
      return;
    }

    setLoading(true);
    const body: Record<string, unknown> = { displayName: displayName.trim() || null, email: email.trim() || null, role };
    if (newPassword) body.newPassword = newPassword;
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to update user.");
      return;
    }
    router.push("/users");
    router.refresh();
  };

  if (fetching) return <div className="p-6">Loading…</div>;
  if (error && !username) return <div className="p-6"><Alert variant="error">{error}</Alert><Link href="/users"><Button variant="secondary" className="mt-4">Back to users</Button></Link></div>;

  return (
    <div className="p-6">
      <PageHeader title="Edit user" description="Update user details. Leave new password blank to keep current." />

      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Input label="Username" value={username} disabled className="bg-slate-50" />
        <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select label="Role" options={[{ value: "user", label: "User" }, { value: "admin", label: "Admin" }]} value={role} onChange={(e) => setRole(e.target.value)} />
        <Input label="New password (optional)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={fieldErrors.newPassword} placeholder="Leave blank to keep current" />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
          <Link href="/users"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
