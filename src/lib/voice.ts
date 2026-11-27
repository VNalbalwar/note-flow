/**
 * The display voice: Google Sans Flex with its corners part-rounded.
 * `rond` is the roundness axis (0 sharp, 100 fully round). The width and
 * weight ranges drive the reactive headline, kept moderate on purpose.
 */
export const VOICE = {
  cssVar: "--font-flex",
  rond: 50,
  widths: [25, 62, 100, 151],
  weights: [300, 1000],
  base: { wdth: 90, wght: 700 },
  peak: 860,
  /** How much a letter's share of the line grows under someone's cursor. */
  swell: 0.6,
} as const;

export function voiceSettings(wght: number, wdth: number, rond: number) {
  return `"wght" ${wght.toFixed(0)}, "wdth" ${wdth.toFixed(1)}, "ROND" ${rond}, "opsz" 144`;
}
