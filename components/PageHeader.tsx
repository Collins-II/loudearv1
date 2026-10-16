"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  eyebrow: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      aria-labelledby="page-header-title"
      className="relative isolate overflow-hidden border-b border-white/10 bg-gradient-to-br from-neutral-950 via-slate-950 to-neutral-900 px-5 pb-8 pt-24 text-white sm:px-8 md:pb-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(110deg, transparent 0%, rgba(56, 189, 248, 0.12) 45%, transparent 75%)",
        }}
      />
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto max-w-7xl"
      >
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              {eyebrow}
            </p>
            <h1
              id="page-header-title"
              className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl"
            >
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
              {description}
            </p>
            {actions && <div className="mt-5">{actions}</div>}
          </div>
          {children && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 lg:justify-end">
              {children}
            </div>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}