-- Migration pour ajouter les tables PvP
-- À exécuter sur PostgreSQL via pgAdmin ou psql

-- Table des joueurs en ligne
CREATE TABLE IF NOT EXISTS online_players (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status player_status_type NOT NULL DEFAULT 'available',
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_online_players_status ON online_players(status);
CREATE INDEX idx_online_players_last_seen ON online_players(last_seen);

-- Table des défis PvP
CREATE TABLE IF NOT EXISTS pvp_challenges (
    id SERIAL PRIMARY KEY,
    challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenged_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenger_team JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pvp_challenges_challenger ON pvp_challenges(challenger_id);
CREATE INDEX idx_pvp_challenges_challenged ON pvp_challenges(challenged_id);
CREATE INDEX idx_pvp_challenges_status ON pvp_challenges(status);

-- Table des matchs PvP
CREATE TABLE IF NOT EXISTS pvp_matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status match_status_type NOT NULL DEFAULT 'WAITING',
    winner_id INTEGER REFERENCES users(id),
    player1_team JSONB NOT NULL,
    player2_team JSONB NOT NULL,
    player1_team_hp INTEGER[] NOT NULL DEFAULT '{}',
    player2_team_hp INTEGER[] NOT NULL DEFAULT '{}',
    player1_active_pokemon INTEGER NOT NULL DEFAULT 0,
    player2_active_pokemon INTEGER NOT NULL DEFAULT 0,
    current_turn_id INTEGER REFERENCES users(id),
    current_question_id INTEGER REFERENCES question_bank(id),
    waiting_for_answer BOOLEAN NOT NULL DEFAULT false,
    turn_number INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_pvp_matches_player1 ON pvp_matches(player1_id);
CREATE INDEX idx_pvp_matches_player2 ON pvp_matches(player2_id);
CREATE INDEX idx_pvp_matches_status ON pvp_matches(status);
CREATE INDEX idx_pvp_matches_current_turn ON pvp_matches(current_turn_id);

-- Table des tours PvP
CREATE TABLE IF NOT EXISTS pvp_turns (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES pvp_matches(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    question_id INTEGER REFERENCES question_bank(id),
    answer_index INTEGER,
    is_correct BOOLEAN,
    damage_dealt INTEGER DEFAULT 0,
    item_used VARCHAR(50),
    item_effect JSONB,
    question_text TEXT,
    question_options JSONB,
    correct_index INTEGER,
    target_pokemon_index INTEGER,
    played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pvp_turns_match ON pvp_turns(match_id);
CREATE INDEX idx_pvp_turns_player ON pvp_turns(player_id);

-- Ajouter le champ last_spin_at à users s'il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_spin_at') THEN
        ALTER TABLE users ADD COLUMN last_spin_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Créer les types ENUM s'ils n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_status_type') THEN
        CREATE TYPE player_status_type AS ENUM ('available', 'in_battle', 'challenged');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status_type') THEN
        CREATE TYPE match_status_type AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');
    END IF;
END $$;
