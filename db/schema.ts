import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey(),
    username: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)],
);

export const sessions = pgTable("sessions", {
  token: text().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productKey: text("product_key").notNull(),
  productName: text("product_name").notNull(),
  decision: text().notNull(),
  carbonGrams: integer("carbon_grams").notNull(),
  plasticGrams: real("plastic_grams").notNull(),
  sugarGrams: real("sugar_grams").notNull(),
  sodiumMg: integer("sodium_mg").notNull(),
  timezone: text().notNull().default("Waktu lokal"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
