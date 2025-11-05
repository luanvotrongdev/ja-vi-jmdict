-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `ant` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dial` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entry` (
	`id` integer PRIMARY KEY NOT NULL,
	`ent_seq` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_ent_seq_unique` ON `entry` (`ent_seq`);--> statement-breakpoint
CREATE TABLE `example` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`ex_srce` text,
	`exsrc_type` text,
	`ex_text` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ex_sent` (
	`id` integer PRIMARY KEY NOT NULL,
	`example_id` integer NOT NULL,
	`xml_lang` text,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`example_id`) REFERENCES `example`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `field` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gloss` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text,
	`xml_lang` text,
	`g_gend` text,
	`g_type` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gloss_pri` (
	`id` integer PRIMARY KEY NOT NULL,
	`gloss_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`gloss_id`) REFERENCES `gloss`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `k_ele` (
	`id` integer PRIMARY KEY NOT NULL,
	`entry_id` integer NOT NULL,
	`keb` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ke_inf` (
	`id` integer PRIMARY KEY NOT NULL,
	`k_ele_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`k_ele_id`) REFERENCES `k_ele`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ke_pri` (
	`id` integer PRIMARY KEY NOT NULL,
	`k_ele_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`k_ele_id`) REFERENCES `k_ele`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lsource` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text,
	`xml_lang` text,
	`ls_type` text,
	`ls_wasei` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `misc` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pos` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `r_ele` (
	`id` integer PRIMARY KEY NOT NULL,
	`entry_id` integer NOT NULL,
	`reb` text NOT NULL,
	`re_nokanji` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `re_inf` (
	`id` integer PRIMARY KEY NOT NULL,
	`r_ele_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`r_ele_id`) REFERENCES `r_ele`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `re_pri` (
	`id` integer PRIMARY KEY NOT NULL,
	`r_ele_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`r_ele_id`) REFERENCES `r_ele`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `re_restr` (
	`id` integer PRIMARY KEY NOT NULL,
	`r_ele_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`r_ele_id`) REFERENCES `r_ele`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sense` (
	`id` integer PRIMARY KEY NOT NULL,
	`entry_id` integer NOT NULL,
	`sense_index` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `s_inf` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stagk` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stagr` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `xref` (
	`id` integer PRIMARY KEY NOT NULL,
	`sense_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`sense_id`) REFERENCES `sense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `raw_word_crawl_json` (
	`id` integer PRIMARY KEY NOT NULL,
	`entry_id` integer NOT NULL,
	`json` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `raw_kanji_crawl_json` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`textId` text,
	`json` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raw_kanji_crawl_json_textId_unique` ON `raw_kanji_crawl_json` (`textId`);
*/