import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const premiumSubscriptions = pgTable('premium_subscriptions', {
  id: uuid('id').primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  plan: text('plan').default('pro').notNull(),
  status: text('status').default('active').notNull(),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  interval: text('interval').default('month').notNull(),
  amount: integer('amount').default(499).notNull(),
  currency: text('currency').default('usd').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
