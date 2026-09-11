import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// A revisioned conference document allows atomic scheduling and block edits.
export const conferences = sqliteTable('conferences', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  data: text('data').notNull(),
});
export const sessions = sqliteTable('presenter_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  submissionId: text('submission_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const loginAttempts = sqliteTable('login_attempts', {
  id: text('id').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
