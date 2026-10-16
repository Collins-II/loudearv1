import type { ReactNode } from "react";

type StudioPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function StudioPageHeader({ eyebrow, title, description, actions }: StudioPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="border-l-2 border-emerald-500 pl-4">
        <p className="mb-1 text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
