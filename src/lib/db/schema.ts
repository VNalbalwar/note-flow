import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("createdAt", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const date = (name: string) => timestamp(name, { withTimezone: true });

/* ---------------------------------------------------------------- Better Auth */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: date("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: date("accessTokenExpiresAt"),
    refreshTokenExpiresAt: date("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: date("expiresAt").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const twoFactor = pgTable(
  "twoFactor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backupCodes").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failedVerificationCount").default(0),
    lockedUntil: date("lockedUntil"),
  },
  (t) => [index("two_factor_secret_idx").on(t.secret), index("two_factor_user_idx").on(t.userId)],
);

export const passkey = pgTable(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("publicKey").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credentialID").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("deviceType").notNull(),
    backedUp: boolean("backedUp").notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: date("createdAt"),
  },
  (t) => [index("passkey_user_idx").on(t.userId), index("passkey_credential_idx").on(t.credentialID)],
);

export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
});

/* --------------------------------------------------------------------- Huddle */

export const doc = pgTable(
  "doc",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default(""),
    icon: text("icon"),
    ownerId: text("ownerId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Template to pour into the page the first time its creator opens it. */
    pendingTemplate: text("pendingTemplate"),
    /** Plain-text copy of the page, sent by editors, used for search and previews. */
    searchText: text("searchText").notNull().default(""),
    trashedAt: date("trashedAt"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("doc_owner_idx").on(t.ownerId)],
);

export const ROLES = ["editor", "viewer"] as const;

export const member = pgTable(
  "member",
  {
    docId: text("docId")
      .notNull()
      .references(() => doc.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.docId, t.userId] }), index("member_user_idx").on(t.userId)],
);

/** An invitation waiting for whoever proves they own this email address. */
export const invite = pgTable(
  "invite",
  {
    id: text("id").primaryKey(),
    docId: text("docId")
      .notNull()
      .references(() => doc.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ROLES }).notNull(),
    invitedById: text("invitedById")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: date("expiresAt").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invite_doc_email_idx").on(t.docId, t.email), index("invite_email_idx").on(t.email)],
);

export const shareLink = pgTable(
  "shareLink",
  {
    id: text("id").primaryKey(),
    docId: text("docId")
      .notNull()
      .references(() => doc.id, { onDelete: "cascade" }),
    /** SHA-256 of the secret in the link. The secret itself is never stored. */
    tokenHash: text("tokenHash").notNull().unique(),
    role: text("role", { enum: ROLES }).notNull(),
    createdById: text("createdById")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: date("expiresAt").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("share_link_doc_idx").on(t.docId)],
);

export const favorite = pgTable(
  "favorite",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    docId: text("docId")
      .notNull()
      .references(() => doc.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.docId] })],
);

export const docRelations = relations(doc, ({ one, many }) => ({
  owner: one(user, { fields: [doc.ownerId], references: [user.id] }),
  members: many(member),
}));
export const memberRelations = relations(member, ({ one }) => ({
  doc: one(doc, { fields: [member.docId], references: [doc.id] }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}));
