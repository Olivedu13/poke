
-- Poke-Edu V1.0 Schema

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- 
-- Table structure for table `users`
-- 
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `grade_level` ENUM('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME') NOT NULL DEFAULT 'CE1',
  `active_subjects` JSON NOT NULL COMMENT 'Array of active subjects e.g. ["MATHS", "FRANCAIS"]',
  `focus_categories` JSON DEFAULT NULL COMMENT 'Map Subject -> Category Name',
  `custom_prompt_active` TINYINT(1) DEFAULT 0,
  `custom_prompt_text` TEXT DEFAULT NULL COMMENT 'Specific topic for AI generation',
  `gold` INT(11) DEFAULT 0,
  `tokens` INT(11) DEFAULT 0,
  `global_xp` INT(11) DEFAULT 0,
  `quiz_elo` INT(11) DEFAULT 1000 COMMENT 'Adaptive difficulty score',
  `streak` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 
-- Table structure for table `user_pokemon`
-- 
CREATE TABLE IF NOT EXISTS `user_pokemon` (
  `id` CHAR(36) NOT NULL COMMENT 'UUID',
  `user_id` INT(11) NOT NULL,
  `tyradex_id` INT(11) NOT NULL COMMENT 'Reference to external API ID',
  `nickname` VARCHAR(50) DEFAULT NULL,
  `level` INT(11) NOT NULL DEFAULT 1,
  `current_hp` INT(11) NOT NULL DEFAULT 20,
  `current_xp` INT(11) NOT NULL DEFAULT 0,
  `is_team` TINYINT(1) DEFAULT 0,
  `obtained_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_user_pokemon` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 
-- Table structure for table `inventory`
-- 
CREATE TABLE IF NOT EXISTS `inventory` (
  `user_id` INT(11) NOT NULL,
  `item_id` VARCHAR(50) NOT NULL COMMENT 'String ID from Items JSON',
  `quantity` INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `item_id`),
  CONSTRAINT `fk_user_inventory` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 
-- Table structure for table `question_bank`
-- 
CREATE TABLE IF NOT EXISTS `question_bank` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `subject` VARCHAR(50) NOT NULL,
  `grade_level` ENUM('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME') NOT NULL,
  `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') DEFAULT 'MEDIUM',
  `category` VARCHAR(50) DEFAULT NULL COMMENT 'Sub-topic e.g. Multiplication, Conjugaison',
  `question_text` TEXT NOT NULL,
  `options_json` JSON NOT NULL COMMENT 'Array of 4 strings',
  `correct_index` TINYINT(4) NOT NULL COMMENT '0-3',
  `explanation` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subject_grade` (`subject`, `grade_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
