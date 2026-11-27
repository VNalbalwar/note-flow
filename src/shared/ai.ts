export const AI_LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Chinese",
  "Japanese",
  "Russian",
] as const;

export type AiLanguage = (typeof AI_LANGUAGES)[number];
