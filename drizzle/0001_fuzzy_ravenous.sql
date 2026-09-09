ALTER TABLE "event_settings" ADD COLUMN "template" varchar(32) DEFAULT 'bridal-shower' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_settings" ADD COLUMN "event_kicker" text DEFAULT 'Bridal Shower' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_settings" ADD COLUMN "venue_name" text DEFAULT 'Angelina''s Restaurant, Staten Island' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_settings" ADD COLUMN "event_date" text DEFAULT 'September 26' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_settings" ADD COLUMN "search_closed_message" text DEFAULT 'Seating will be revealed on the day of the celebration.' NOT NULL;