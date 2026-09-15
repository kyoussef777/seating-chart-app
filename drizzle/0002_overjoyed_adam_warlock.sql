ALTER TABLE "labels" ADD COLUMN "color" varchar(20) DEFAULT '#064e3b' NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "background" varchar(12) DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "bold" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "align" varchar(10) DEFAULT 'center' NOT NULL;--> statement-breakpoint
ALTER TABLE "reference_objects" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "reference_objects" ADD COLUMN "color" varchar(20);--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "opacity" real DEFAULT 0.15 NOT NULL;--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "border_color" varchar(50) DEFAULT '#22c55e' NOT NULL;--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "border_style" varchar(12) DEFAULT 'dashed' NOT NULL;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "width" real;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "height" real;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "color" varchar(20);