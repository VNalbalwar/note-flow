/** Starting points for new pages. Content is BlockNote's block format. */

type Inline = string;
export type TemplateBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: Inline | { type: "tableContent"; rows: { cells: string[] }[] };
};

export const TEMPLATE_IDS = ["lecture", "lab", "project", "spec", "meeting", "study", "event"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type Template = {
  id: TemplateId;
  title: string;
  icon: string;
  blurb: string;
  blocks: TemplateBlock[];
};

const h = (text: string, level = 2): TemplateBlock => ({ type: "heading", props: { level }, content: text });
const p = (text = ""): TemplateBlock => ({ type: "paragraph", content: text });
const bullet = (text = ""): TemplateBlock => ({ type: "bulletListItem", content: text });
const num = (text = ""): TemplateBlock => ({ type: "numberedListItem", content: text });
const todo = (text = ""): TemplateBlock => ({ type: "checkListItem", content: text });
const quote = (text: string): TemplateBlock => ({ type: "quote", content: text });
const table = (...rows: string[][]): TemplateBlock => ({
  type: "table",
  content: { type: "tableContent", rows: rows.map((cells) => ({ cells })) },
});
const code = (language: string, text: string): TemplateBlock => ({ type: "codeBlock", props: { language }, content: text });

export const TEMPLATES: readonly Template[] = [
  {
    id: "lecture",
    title: "Lecture notes",
    icon: "book",
    blurb: "Key ideas, examples and open questions",
    blocks: [
      p("Course, lecture number and date"),
      h("Key ideas"),
      bullet(),
      h("Worked example"),
      p(),
      h("Questions to ask"),
      todo(),
      h("Summary in our own words"),
      p(),
    ],
  },
  {
    id: "lab",
    title: "Lab report",
    icon: "flask",
    blurb: "Aim, method, results and conclusion",
    blocks: [
      h("Aim"),
      p(),
      h("Setup"),
      bullet("Hardware:"),
      bullet("Software and versions:"),
      h("Method"),
      num(),
      h("Results"),
      table(["Run", "Input", "Observation"], ["1", "", ""], ["2", "", ""], ["3", "", ""]),
      h("Discussion"),
      p("What matched what we expected, and what didn't?"),
      h("Conclusion"),
      p(),
    ],
  },
  {
    id: "project",
    title: "Project plan",
    icon: "flag",
    blurb: "Goal, owners, milestones and risks",
    blocks: [
      h("Goal"),
      p("One sentence on what done looks like."),
      h("Who does what"),
      table(["Person", "Owns", "Due"], ["", "", ""], ["", "", ""]),
      h("Milestones"),
      todo("First working version"),
      todo("Testing"),
      todo("Final submission"),
      h("Risks"),
      bullet(),
    ],
  },
  {
    id: "spec",
    title: "Technical spec",
    icon: "code",
    blurb: "Problem, design, interface and trade-offs",
    blocks: [
      h("Problem"),
      p(),
      h("Non-goals"),
      bullet(),
      h("Proposed design"),
      p(),
      h("Interface"),
      code("typescript", "export type Request = {\n  id: string;\n};"),
      h("Trade-offs considered"),
      table(["Option", "Good", "Bad"], ["", "", ""]),
      h("Open questions"),
      todo(),
    ],
  },
  {
    id: "meeting",
    title: "Meeting notes",
    icon: "people",
    blurb: "Agenda, decisions and action items",
    blocks: [p("Date and who joined"), h("Agenda"), num(), h("Notes"), bullet(), h("Decisions"), bullet(), h("Action items"), todo()],
  },
  {
    id: "study",
    title: "Exam study plan",
    icon: "target",
    blurb: "Topics, who explains what, and progress",
    blocks: [
      h("Exam"),
      p("Subject, date and what is covered."),
      h("Topics"),
      table(["Topic", "Explained by", "Confidence"], ["", "", ""], ["", "", ""], ["", "", ""]),
      h("Past questions to solve"),
      todo(),
      quote("If you can explain it to the group, you know it."),
    ],
  },
  {
    id: "event",
    title: "Event run sheet",
    icon: "calendar",
    blurb: "Schedule, tasks, budget and contacts",
    blocks: [
      h("Schedule"),
      table(["Time", "What happens", "Lead"], ["", "", ""], ["", "", ""]),
      h("Before the day"),
      todo("Book the venue"),
      todo("Share the poster"),
      h("Budget"),
      table(["Item", "Cost", "Paid by"], ["", "", ""]),
      h("Contacts"),
      bullet(),
    ],
  },
];

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
