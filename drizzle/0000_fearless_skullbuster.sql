CREATE TABLE `conferences` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `presenter_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
