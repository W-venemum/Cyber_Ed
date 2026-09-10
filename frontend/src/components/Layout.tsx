import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { DISCLAIMER_TEXT } from "../constants";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/assessments", label: "Assessments", end: false },
  { to: "/misconceptions", label: "Misconception Map", end: false },
  { to: "/about", label: "About / Method", end: false },
];

function NavItem({
  to,
  label,
  end,
}: {
  to: string;
  label: string;
  end: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      {/* UI-wide disclaimer banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
        <span className="font-semibold">Prototype notice: </span>
        {DISCLAIMER_TEXT}
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        {/* Sidebar navigation */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-6">
            <div className="mb-4 flex items-center gap-2 px-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                AA
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-slate-900">
                  Assessment Auditor
                </p>
                <p className="text-[11px] leading-tight text-slate-500">
                  Diagnostic quality tool
                </p>
              </div>
            </div>
            <nav className="space-y-1">
              {NAV.map((n) => (
                <NavItem key={n.to} {...n} />
              ))}
            </nav>
            <p className="mt-6 px-3 text-[11px] leading-relaxed text-slate-400">
              SIH 2026 prototype · Team Cyber Sentinels · PS 26207. Deterministic
              engine, no student data.
            </p>
          </div>
        </aside>

        {/* Mobile top nav */}
        <div className="md:hidden">
          <nav className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-slate-200 bg-white px-2 py-2 shadow">
            {NAV.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
          </nav>
        </div>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
