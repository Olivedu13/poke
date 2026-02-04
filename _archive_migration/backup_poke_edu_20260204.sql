BEGIN;

-- 1. SUPPRESSION DES TABLES SI ELLES EXISTENT (Pour repartir à neuf)
DROP TABLE IF EXISTS pvp_turns, pvp_matches, pvp_challenges, online_players, user_pokemon, inventory, items, question_bank, users CASCADE;
DROP TYPE IF EXISTS grade_level_type, rarity_type, player_status_type, challenge_status_type, match_status_type, difficulty_type;

-- 2. CRÉATION DES TYPES ENUM
CREATE TYPE grade_level_type AS ENUM ('CP','CE1','CE2','CM1','CM2','6EME','5EME','4EME','3EME');
CREATE TYPE rarity_type AS ENUM ('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY');
CREATE TYPE player_status_type AS ENUM ('available','in_battle','challenged');
CREATE TYPE challenge_status_type AS ENUM ('pending','accepted','declined','expired','seen');
CREATE TYPE match_status_type AS ENUM ('WAITING','IN_PROGRESS','COMPLETED','ABANDONED');
CREATE TYPE difficulty_type AS ENUM ('EASY','MEDIUM','HARD');

-- 3. STRUCTURE DES TABLES
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    grade_level grade_level_type DEFAULT 'CE1' NOT NULL,
    active_subjects JSONB NOT NULL,
    custom_prompt_active BOOLEAN DEFAULT FALSE,
    custom_prompt_text TEXT,
    gold INTEGER DEFAULT 0,
    tokens INTEGER DEFAULT 0,
    global_xp INTEGER DEFAULT 0,
    quiz_elo INTEGER DEFAULT 1000,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    focus_categories JSONB
);

CREATE TABLE items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    effect_type VARCHAR(50) NOT NULL,
    value INTEGER NOT NULL,
    rarity rarity_type DEFAULT 'COMMON',
    image VARCHAR(100) DEFAULT 'pokeball.webp' NOT NULL
);

CREATE TABLE inventory (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE user_pokemon (
    id CHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tyradex_id INTEGER NOT NULL,
    nickname VARCHAR(50),
    level INTEGER DEFAULT 1 NOT NULL,
    current_hp INTEGER DEFAULT 20 NOT NULL,
    current_xp INTEGER DEFAULT 0 NOT NULL,
    is_team BOOLEAN DEFAULT FALSE,
    obtained_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE online_players (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status player_status_type DEFAULT 'available',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pvp_challenges (
    id SERIAL PRIMARY KEY,
    challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenged_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status challenge_status_type DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    challenger_team JSONB
);

CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(50) NOT NULL,
    grade_level grade_level_type NOT NULL,
    difficulty difficulty_type DEFAULT 'MEDIUM',
    category VARCHAR(50),
    question_text TEXT NOT NULL,
    options_json JSONB NOT NULL,
    correct_index SMALLINT NOT NULL,
    explanation TEXT NOT NULL
);

CREATE TABLE pvp_matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status match_status_type DEFAULT 'WAITING',
    current_turn INTEGER REFERENCES users(id) ON DELETE SET NULL,
    winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    player1_team JSONB,
    player2_team JSONB,
    player1_team_hp JSONB,
    player2_team_hp JSONB,
    player1_active_pokemon SMALLINT DEFAULT 0,
    player2_active_pokemon SMALLINT DEFAULT 0,
    xp_reward INTEGER DEFAULT 50,
    waiting_for_answer BOOLEAN DEFAULT FALSE,
    current_question_id INTEGER
);

CREATE TABLE pvp_turns (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES pvp_matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    question_id INTEGER,
    answer_index SMALLINT,
    is_correct BOOLEAN,
    damage_dealt INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    question_text TEXT,
    question_options JSONB,
    correct_index SMALLINT,
    target_pokemon_index SMALLINT
);

-- 4. INSERTION DES DONNÉES

-- Users
INSERT INTO users (id, username, password_hash, grade_level, active_subjects, custom_prompt_active, custom_prompt_text, gold, tokens, global_xp, quiz_elo, streak, created_at, focus_categories) VALUES
(1, 'oli', '$2y$12$oVMfVdwmk7VM0EtLNFz4ROfmvSYRQGYRc7oO7CqMUv3.B6PPhW.MC', 'CM2', '[]', true, 'Les mois de l annee en anglais', 980324, 9727, 1495300, 1000, 0, '2026-01-30 14:03:33', '{}'),
(2, 'yaa', '$2y$12$MS8HOn7NtXaOJWKEh.5RCejiTb.5A8akR/pIiAcqrkwk7cOvkBc2W', 'CE1', '["MATHS", "FRANCAIS"]', false, NULL, 100, 5, 0, 1000, 0, '2026-02-03 11:11:21', NULL),
(6, 'mateo', '$2y$12$T8VCLUopVnxtOVgTdM4lVemDDmHxTuJB2M8emXoV1EUly4ZoVjfeK', '3EME', '["MATHS", "FRANCAIS"]', false, NULL, 725, 2, 0, 1000, 0, '2026-02-03 14:29:09', NULL);

-- Items
INSERT INTO items (id, name, description, price, effect_type, value, rarity, image) VALUES
('atk_r1', 'Attaque +', '+10 ATK temporaire', 100, 'BUFF_ATK', 10, 'COMMON', 'attaque.webp'),
('pokeball', 'Pokéball', 'Capture un Pokémon', 200, 'CAPTURE', 1, 'COMMON', 'pokeball.webp'),
('xp_pack', 'Pack XP', '+500 XP Global', 1000, 'XP_BOOST', 500, 'RARE', 'xp.webp');

-- Question Bank (Extrait)
INSERT INTO question_bank (id, subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) VALUES
(19, 'MATHS', 'CE1', 'EASY', 'ADDITION', 'Combien font 10 + 10 + 10 ?', '["20", "30", "40", "100"]', 1, 'Trois dizaines font 30.'),
(119, 'ANGLAIS', 'CE1', 'EASY', 'SALUTATIONS', 'Comment dit-on ''Bonjour'' (le matin) en anglais ?', '["Goodbye", "Good morning", "Good night", "Thank you"]', 1, 'On dit ''Good morning'' pour saluer quelqu''un le matin.');

-- Inventory
INSERT INTO inventory (user_id, item_id, quantity) VALUES (1, 'atk_r1', 4), (6, 'atk_r1', 1);

-- 5. RÉALIGNEMENT DES SÉQUENCES (Indispensable pour Postgres)
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('pvp_challenges_id_seq', (SELECT MAX(id) FROM pvp_challenges));
SELECT setval('pvp_matches_id_seq', (SELECT MAX(id) FROM pvp_matches));
SELECT setval('question_bank_id_seq', (SELECT MAX(id) FROM question_bank));

COMMIT;