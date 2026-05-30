import { PropsWithChildren } from "react";

type Tone = "green" | "gray" | "amber" | "red";

const tones: Record<Tone, string> = {
  green: "border-brand-100 bg-brand-50 text-brand-700",
  gray: "border-line bg-canvas text-muted",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-700"
};

export function Badge({ children, tone = "gray" }: PropsWithChildren<{ tone?: Tone }>) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
