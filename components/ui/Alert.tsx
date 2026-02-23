type Props = {
  variant?: "error" | "success" | "info";
  title?: string;
  children: React.ReactNode;
};

export function Alert({ variant = "error", title, children }: Props) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-slate-200 bg-slate-50 text-slate-800",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 ${styles[variant]}`} role="alert">
      {title && <p className="font-medium">{title}</p>}
      <p className={title ? "mt-0.5 text-sm" : "text-sm"}>{children}</p>
    </div>
  );
}
