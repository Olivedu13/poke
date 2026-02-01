
export type GradeLevel = 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6EME' | '5EME' | '4EME' | '3EME';
export type Subject = 'MATHS' | 'FRANCAIS' | 'ANGLAIS' | 'HISTOIRE' | 'GEO' | 'PHYSIQUE' | 'SVT';

export interface User {
  id: number;
  username: string;
  grade_level: GradeLevel;
  active_subjects: Subject[]; 
  custom_prompt_active: boolean; 
  custom_prompt_text: string | null;
  gold: number;
  tokens: number;
  streak: number;
  global_xp: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  user?: T; 
  message?: string;
  // Evolution specific
  evolution?: boolean;
  sequence?: number[];
}

// Battle & Gameplay Types

export interface PokemonStats {
  atk: number;
  def: number;
  spe: number;
}

export interface Pokemon {
  id: string; // UUID or ID
  name: string;
  sprite_url: string;
  level: number;
  max_hp: number;
  current_hp: number;
  type: string; // 'Fire', 'Water', 'Grass', etc.
  current_xp: number;
  next_level_xp?: number; // Added for UI bar
  tyradex_id: number;
  is_team?: boolean; // Active squad
  stats?: PokemonStats; // Added stats
}

export interface Question {
  id: string | number;
  source: 'DB' | 'AI';
  subject: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  effect_type: 'HEAL' | 'HEAL_TEAM' | 'BUFF_ATK' | 'BUFF_DEF' | 'DMG_FLAT' | 'EVOLUTION' | 'EVOLUTION_MAX' | 'STATUS_SLEEP' | 'STATUS_POISON' | 'SPECIAL_MIRROR' | 'XP_BOOST' | 'TOKEN_PACK' | 'CAPTURE' | 'JOKER';
  value: number; // e.g., 20 for 20% heal
  quantity: number;
  price?: number;
  rarity?: string;
  image?: string; 
}

export interface CombatLog {
  message: string;
  type: 'INFO' | 'PLAYER' | 'ENEMY' | 'CRITICAL';
}

export type ViewState = 'AUTH' | 'DASHBOARD' | 'GAME' | 'COLLECTION' | 'SHOP' | 'WHEEL';
