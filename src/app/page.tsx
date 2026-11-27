import Link from "next/link";
import { HuddleType } from "@/components/landing/HuddleType";
import { HeroArtifacts } from "@/components/landing/HeroArtifacts";
import { Aurora } from "@/components/landing/Aurora";
import { Ticker } from "@/components/landing/Ticker";
import { SheetStage } from "@/components/landing/SheetStage";
import { Chapters } from "@/components/landing/Chapters";
import { Blocks } from "@/components/landing/Blocks";
import { SecurityList } from "@/components/landing/SecurityList";
import { Finale } from "@/components/landing/Finale";
import { CoWrittenHeading } from "@/components/landing/headings/CoWrittenHeading";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LandingPage() {
  return (
    <div>
      <div className="relative isolate flex min-h-svh flex-col overflow-x-clip">
        <Aurora />
        <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link href="/" aria-label="Huddle home">
            <span className="wordmark">huddle</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/sign-in" className="px-2 py-2 text-sm font-semibold hover:underline sm:px-3">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-solid btn-sm">
              Start writing
            </Link>
          </nav>
        </header>

        <section className="relative flex flex-1 flex-col justify-center px-5 pb-16 pt-2 md:px-10 lg:pt-20">
          <HeroArtifacts />
          <HuddleType>
            <Link href="/sign-up" className="btn btn-solid">
              Start writing
            </Link>
          </HuddleType>
        </section>
      </div>

      <main>
        <Ticker />

        <section className="relative isolate overflow-x-clip px-5 py-24 md:px-10 md:py-36">
          <Aurora />
          <CoWrittenHeading />
          <p className="mx-auto mb-14 mt-6 max-w-[46ch] text-center text-xl leading-relaxed text-ink-2">
            Each person carries one colour on their cursor, their selection and their face in the corner, so you always
            know who is doing what.
          </p>
          <SheetStage />
        </section>

        <Chapters />
        <Blocks />
        <SecurityList />
        <Finale />
      </main>

      <footer className="flex flex-col gap-3 border-t border-line px-5 pb-10 pt-8 text-sm text-ink-3 md:flex-row md:justify-between md:px-10">
        <p>Huddle is a student-built project. The people on this page are demo characters.</p>
        <p>Free to use. No card needed.</p>
      </footer>

    </div>
  );
}
