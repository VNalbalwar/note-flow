import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { haveIBeenPwned, twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "./env";
import { sendMail } from "./mail";
import { purgeRoom } from "./sync";
import { dropLiveSessions } from "./live";

const DAY = 60 * 60 * 24;

/** Display names are shown to collaborators: single line, bounded, no control characters. */
export function cleanName(value: unknown) {
  const name = String(value ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return name || "Unnamed";
}

function createAuth() {
  const appUrl = new URL(env.APP_URL);

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }

  return betterAuth({
    appName: "Huddle",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [appUrl.origin],
    database: drizzleAdapter(db, { provider: "pg", schema }),

    disabledPaths: ["/list-sessions", "/revoke-session"],

    emailAndPassword: {
      enabled: true,
      // Invitations are matched by email, so an address must be proven first.
      requireEmailVerification: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      onPasswordReset: async ({ user }) => {
        await dropLiveSessions(user.id);
      },
      resetPasswordTokenExpiresIn: 60 * 30,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: "Reset your Huddle password",
          intro: "Someone asked to reset the password for this email address.",
          action: "Choose a new password",
          url,
          footer: "The link works once and expires in 30 minutes. If this wasn't you, ignore this email.",
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: "Confirm your email for Huddle",
          intro: "Confirm this email address to finish setting up your Huddle account.",
          action: "Confirm email",
          url,
          footer: "The link expires in one hour. If you didn't create an account, ignore this email.",
        });
      },
    },
    socialProviders,
    account: { encryptOAuthTokens: true },

    session: {
      expiresIn: 7 * DAY,
      updateAge: DAY,
      freshAge: DAY,
      // No cookie cache: signing a device out must take effect immediately.
    },

    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const owned = await db.select({ id: schema.doc.id }).from(schema.doc).where(eq(schema.doc.ownerId, user.id));
          await Promise.all(owned.map((d) => purgeRoom(d.id)));
        },
      },
    },

    rateLimit: {
      enabled: true,
      // Stored in the database so limits hold across serverless instances.
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60 * 10, max: 5 },
        "/request-password-reset": { window: 60 * 10, max: 3 },
        "/send-verification-email": { window: 60 * 10, max: 3 },
        "/reset-password": { window: 60 * 10, max: 5 },
        "/change-password": { window: 60 * 10, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 5 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },

    advanced: {
      cookiePrefix: "huddle",
      useSecureCookies: appUrl.protocol === "https:",
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, name: cleanName(user.name) } }),
        },
        update: {
          before: async (user) => ({
            data: user.name === undefined ? user : { ...user, name: cleanName(user.name) },
          }),
        },
      },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // A free-text avatar URL would let anyone plant a tracking pixel in other people's pages.
        if ((ctx.path === "/update-user" || ctx.path === "/sign-up/email") && ctx.body?.image != null) {
          throw new APIError("BAD_REQUEST", { message: "Profile pictures can't be set this way." });
        }
      }),
    },

    plugins: [
      twoFactor({ issuer: "Huddle", allowPasswordless: true }),
      passkey({
        rpID: appUrl.hostname,
        rpName: "Huddle",
        origin: appUrl.origin,
        // A passkey sign-in skips the two-step code, so the device must verify the person.
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      }),
      haveIBeenPwned({
        customPasswordCompromisedMessage:
          "This password has appeared in a data breach. Choose one you haven't used anywhere else.",
      }),
      // Must stay last so it can set cookies from server actions.
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so a build does not need runtime secrets. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}

export function enabledProviders() {
  return {
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  };
}
