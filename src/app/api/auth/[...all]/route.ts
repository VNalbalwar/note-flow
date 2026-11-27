import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";

export const { GET, POST } = toNextJsHandler({ handler: (request: Request) => getAuth().handler(request) });
