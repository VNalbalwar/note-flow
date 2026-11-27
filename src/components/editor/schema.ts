import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from "@blocknote/core";
import { codeBlockOptions } from "@blocknote/code-block";

// Video, audio and file blocks are left out: Huddle's free storage holds images only.
const { audio, video, file, codeBlock, ...blocks } = defaultBlockSpecs;
void [audio, video, file, codeBlock];

export const schema = BlockNoteSchema.create({
  blockSpecs: { ...blocks, codeBlock: createCodeBlockSpec(codeBlockOptions) },
});

export type HuddleEditor = typeof schema.BlockNoteEditor;
export type HuddleBlock = typeof schema.Block;
export type HuddlePartialBlock = typeof schema.PartialBlock;

/** Name of the shared fragment that holds the page body. */
export const FRAGMENT = "document-store";
