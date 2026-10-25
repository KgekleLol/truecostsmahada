CREATE TABLE "habit_logs" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"product_key" text NOT NULL,
	"product_name" text NOT NULL,
	"decision" text NOT NULL,
	"carbon_grams" integer NOT NULL,
	"plastic_grams" real NOT NULL,
	"sugar_grams" real NOT NULL,
	"sodium_mg" integer NOT NULL,
	"timezone" text DEFAULT 'Waktu lokal' NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" ("username");--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;