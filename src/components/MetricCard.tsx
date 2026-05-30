import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-xl2 border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-ink">{value}</div>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}
