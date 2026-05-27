CREATE TABLE `content_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_id` int NOT NULL,
	`user_id` int NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`full_content` text,
	`url` text NOT NULL,
	`author` varchar(255),
	`published_at` timestamp NOT NULL,
	`category` varchar(100),
	`relevance_score` int DEFAULT 50,
	`is_read` tinyint NOT NULL DEFAULT 0,
	`is_saved` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('rss','blog','newsletter','news') NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`last_fetched` timestamp,
	`fetch_frequency` int NOT NULL DEFAULT 15,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`digest_time` varchar(5) DEFAULT '08:00',
	`view_mode` enum('inbox','magazine','cards') NOT NULL DEFAULT 'inbox',
	`enable_digest` tinyint NOT NULL DEFAULT 1,
	`categories_filter` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_source_id_content_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `content_sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_sources` ADD CONSTRAINT `content_sources_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;