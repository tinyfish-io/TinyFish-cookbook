CREATE TABLE `audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(32) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`overallScore` float,
	`results` json,
	`errorMessage` text,
	`ipHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `audits_slug_unique` UNIQUE(`slug`)
);
