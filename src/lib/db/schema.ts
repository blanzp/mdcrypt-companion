import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "active"]);
export const sessionModeEnum = pgEnum("session_mode", ["private", "shared"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("member"),
  mcpApiKey: text("mcp_api_key"),
  mcpSharedApiKey: text("mcp_shared_api_key"),
  mcpCryptId: text("mcp_crypt_id"),
  mcpSharedCryptId: text("mcp_shared_crypt_id"),
  inviteStatus: inviteStatusEnum("invite_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Sessions
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  mode: sessionModeEnum("mode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Session Participants
export const sessionParticipants = pgTable(
  "session_participants",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] })]
);

// Messages
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, {
    onDelete: "set null",
  }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedSessions: many(sessions),
  participations: many(sessionParticipants),
  messages: many(messages),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  owner: one(users, { fields: [sessions.ownerId], references: [users.id] }),
  participants: many(sessionParticipants),
  messages: many(messages),
}));

export const sessionParticipantsRelations = relations(
  sessionParticipants,
  ({ one }) => ({
    session: one(sessions, {
      fields: [sessionParticipants.sessionId],
      references: [sessions.id],
    }),
    user: one(users, {
      fields: [sessionParticipants.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));
