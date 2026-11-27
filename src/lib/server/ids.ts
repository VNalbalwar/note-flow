import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const newId = () => randomBytes(16).toString("base64url");
export const newSecret = () => randomBytes(32).toString("base64url");
export const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");
