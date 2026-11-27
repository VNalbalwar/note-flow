import Link from "next/link";
import { Gathering } from "@/components/auth/Gathering";
import { Aurora } from "@/components/landing/Aurora";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Toaster } from "@/components/ui/Toasts";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative isolate flex flex-col px-5 py-5 sm:px-10">
        <Aurora />
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Huddle home">
            <span className="wordmark">huddle</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center py-10">{children}</main>
      </div>
      <aside className="hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[10px_44px_44px_44px]" style={{ background: "var(--hero)" }}>
          <span className="dots absolute inset-0 opacity-70" />
          <Gathering />
        </div>
      </aside>
      <Toaster />
    </div>
  );
}
