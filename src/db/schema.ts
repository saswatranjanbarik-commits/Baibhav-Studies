import { pgTable, text, json, timestamp } from 'drizzle-orm/pg-core';

export const store = pgTable('store', {
  key: text('key').primaryKey(),
  value: json('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
