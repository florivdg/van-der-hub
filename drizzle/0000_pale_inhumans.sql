CREATE TABLE `browsers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`browserKey` text NOT NULL,
	`machineKey` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
