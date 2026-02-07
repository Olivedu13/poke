-- Rebalance item prices based on rarity and category
-- Economy: ~50-300 gold per battle (average ~100-150)
-- Items should cost 1-20+ battles worth of gold depending on rarity/power

-- COMMON items: 50-150 gold (1-2 battles)
UPDATE items SET price = 50 WHERE rarity = 'COMMON' AND effect_type = 'HEAL' AND value <= 30;
UPDATE items SET price = 80 WHERE rarity = 'COMMON' AND effect_type = 'CAPTURE';
UPDATE items SET price = 100 WHERE rarity = 'COMMON' AND effect_type IN ('BUFF_ATK', 'BUFF_DEF');
UPDATE items SET price = 100 WHERE rarity = 'COMMON' AND effect_type = 'DMG_FLAT';

-- UNCOMMON items: 200-400 gold (2-4 battles)
UPDATE items SET price = 200 WHERE rarity = 'UNCOMMON' AND effect_type = 'HEAL';
UPDATE items SET price = 250 WHERE rarity = 'UNCOMMON' AND effect_type IN ('BUFF_ATK', 'BUFF_DEF');
UPDATE items SET price = 300 WHERE rarity = 'UNCOMMON' AND effect_type = 'DMG_FLAT';
UPDATE items SET price = 300 WHERE rarity = 'UNCOMMON' AND effect_type IN ('STATUS_SLEEP', 'STATUS_POISON', 'SLEEP', 'POISON');
UPDATE items SET price = 350 WHERE rarity = 'UNCOMMON' AND effect_type = 'TRAITOR';
UPDATE items SET price = 200 WHERE rarity = 'UNCOMMON' AND effect_type = 'CAPTURE';

-- RARE items: 500-1000 gold (5-10 battles)
UPDATE items SET price = 500 WHERE rarity = 'RARE' AND effect_type = 'HEAL';
UPDATE items SET price = 600 WHERE rarity = 'RARE' AND effect_type IN ('BUFF_ATK', 'BUFF_DEF');
UPDATE items SET price = 700 WHERE rarity = 'RARE' AND effect_type = 'DMG_FLAT';
UPDATE items SET price = 800 WHERE rarity = 'RARE' AND effect_type IN ('STATUS_SLEEP', 'STATUS_POISON', 'SLEEP', 'POISON');
UPDATE items SET price = 600 WHERE rarity = 'RARE' AND effect_type = 'TRAITOR';
UPDATE items SET price = 500 WHERE rarity = 'RARE' AND effect_type = 'CAPTURE';
UPDATE items SET price = 800 WHERE rarity = 'RARE' AND effect_type = 'HEAL_TEAM';
UPDATE items SET price = 1000 WHERE rarity = 'RARE' AND effect_type IN ('JOKER', 'SPECIAL_MIRROR');

-- EPIC items: 1500-3000 gold (15-30 battles)
UPDATE items SET price = 1500 WHERE rarity = 'EPIC' AND effect_type = 'HEAL';
UPDATE items SET price = 1500 WHERE rarity = 'EPIC' AND effect_type = 'HEAL_TEAM';
UPDATE items SET price = 2000 WHERE rarity = 'EPIC' AND effect_type IN ('BUFF_ATK', 'BUFF_DEF');
UPDATE items SET price = 2500 WHERE rarity = 'EPIC' AND effect_type IN ('STATUS_SLEEP', 'STATUS_POISON', 'SLEEP', 'POISON');
UPDATE items SET price = 2000 WHERE rarity = 'EPIC' AND effect_type = 'TRAITOR';
UPDATE items SET price = 3000 WHERE rarity = 'EPIC' AND effect_type IN ('JOKER', 'SPECIAL_MIRROR');
UPDATE items SET price = 2500 WHERE rarity = 'EPIC' AND effect_type = 'EVOLUTION';

-- LEGENDARY items: 5000-15000 gold (50-150 battles)
UPDATE items SET price = 5000 WHERE rarity = 'LEGENDARY' AND effect_type = 'HEAL';
UPDATE items SET price = 5000 WHERE rarity = 'LEGENDARY' AND effect_type = 'HEAL_TEAM';
UPDATE items SET price = 8000 WHERE rarity = 'LEGENDARY' AND effect_type IN ('BUFF_ATK', 'BUFF_DEF');
UPDATE items SET price = 10000 WHERE rarity = 'LEGENDARY' AND effect_type IN ('STATUS_SLEEP', 'STATUS_POISON', 'SLEEP', 'POISON');
UPDATE items SET price = 10000 WHERE rarity = 'LEGENDARY' AND effect_type = 'TRAITOR';
UPDATE items SET price = 15000 WHERE rarity = 'LEGENDARY' AND effect_type IN ('JOKER', 'SPECIAL_MIRROR');
UPDATE items SET price = 10000 WHERE rarity = 'LEGENDARY' AND effect_type = 'EVOLUTION';
UPDATE items SET price = 15000 WHERE rarity = 'LEGENDARY' AND effect_type = 'EVOLUTION_MAX';

-- Fallback: items still with old prices get default for their rarity
UPDATE items SET price = 100 WHERE rarity = 'COMMON' AND price > 500;
UPDATE items SET price = 300 WHERE rarity = 'UNCOMMON' AND price > 1000;
UPDATE items SET price = 800 WHERE rarity = 'RARE' AND price > 2000;
UPDATE items SET price = 2000 WHERE rarity = 'EPIC' AND price > 5000;
UPDATE items SET price = 8000 WHERE rarity = 'LEGENDARY' AND price > 20000;

-- XP / Token packs
UPDATE items SET price = 500 WHERE effect_type = 'XP_BOOST' AND rarity = 'RARE';
UPDATE items SET price = 1000 WHERE effect_type = 'XP_BOOST' AND rarity = 'EPIC';
UPDATE items SET price = 300 WHERE effect_type = 'TOKEN_PACK';
