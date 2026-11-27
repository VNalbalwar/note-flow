import {
  BookOpen,
  CalendarDays,
  CodeXml,
  Coffee,
  FileText,
  Flag,
  FlaskConical,
  Lightbulb,
  Rocket,
  Star,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { inkFor } from "@/lib/people";

export const DOC_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  flask: FlaskConical,
  flag: Flag,
  code: CodeXml,
  people: UsersRound,
  target: Target,
  calendar: CalendarDays,
  idea: Lightbulb,
  rocket: Rocket,
  coffee: Coffee,
  star: Star,
};

/** A page's mark: its chosen icon on a colour that stays the same for that page. */
export function DocIcon({ id, icon, size = "md" }: { id: string; icon: string | null; size?: "sm" | "md" | "lg" }) {
  const Icon = (icon && DOC_ICONS[icon]) || FileText;
  const person = inkFor(id);
  const box = size === "lg" ? "size-14" : size === "md" ? "size-9" : "size-6";
  const glyph = size === "lg" ? "size-7" : size === "md" ? "size-[1.15rem]" : "size-3.5";
  return (
    <span className={`tag grid shrink-0 place-items-center ${box}`} style={{ background: person.ink, color: person.on }}>
      <Icon className={glyph} aria-hidden="true" />
    </span>
  );
}
