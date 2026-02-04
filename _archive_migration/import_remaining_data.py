#!/usr/bin/env python3
import paramiko
import sys

hostname = '87.106.1.134'
username = 'root'
password = 'rzoP3HCG'

# SQL commands to import remaining data with ON CONFLICT
sql_commands = [
    # Clear existing duplicate data first (optional)
    """
    -- Import users (skip if exists)
    INSERT INTO users (id, username, password_hash, grade_level, active_subjects, custom_prompt_active, custom_prompt_text, gold, tokens, global_xp, quiz_elo, streak, created_at, focus_categories) VALUES
        (3, 'val', '$2y$12$PTOk.oOsEkLG5VChzN85jeXvp7uIgLMdpP8j1kAOd3T8iuDMQyC/G', 'CM1'::grade_level_type, '[]'::jsonb, false, NULL, 1320, 6, 0, 1000, 0, '2026-02-03 11:11:57', NULL),
        (4, 'test1', '$2y$12$DTqLqp0fxSXBf5BoaJFyUO74WWF7lVYd/jUomPLyy8CWfU6iCQzjW', 'CE2'::grade_level_type, '[]'::jsonb, false, NULL, 1100, 5, 0, 1000, 0, '2026-02-03 11:35:37', NULL),
        (5, 'mateo2', '$2y$12$Zp.u04Eu4glYfk14VK73m.DgPNKKlFCwbw9yUqo55sCgFCHw9wjqW', 'CM2'::grade_level_type, '["MATHS"]'::jsonb, false, NULL, 1225, 3, 0, 1000, 0, '2026-02-03 13:03:32', NULL),
        (8, 'Jil', '$2y$12$1O/yK4J2RjUVHVj7EwKSieCULfWJnD8GZ1qA.P.VPwKLO3C9CRQ1m', 'CE1'::grade_level_type, '[]'::jsonb, false, NULL, 1120, 5, 0, 1000, 0, '2026-02-03 18:09:11', NULL),
        (9, 'moi', '$2y$12$jB72s8LjfWKmXGWPjx.TAuOA.G/pLcDOYQXY/mjR5EYz5iGlQv0nW', 'CE1'::grade_level_type, '[]'::jsonb, false, NULL, 975, 5, 0, 1000, 0, '2026-02-04 10:17:16', NULL),
        (10, 'Lucas', '$2y$12$RXKK2L6zZfHmAVVX4OWI8eW.n.xDPFUjX/cI9EY6gDV9e77EQb1e.', 'CE1'::grade_level_type, '[]'::jsonb, false, NULL, 1050, 4, 0, 1000, 0, '2026-02-04 10:25:22', NULL),
        (11, 'Alex', '$2y$12$xVPWMihOeRfhZzlVJKh7D.Kgm5kYOOIIStj3y8wEkSTZX0KQdwEvu', 'CE1'::grade_level_type, '[]'::jsonb, false, NULL, 1050, 4, 0, 1000, 0, '2026-02-04 10:26:59', NULL),
        (12, 'lou', '$2y$12$qQhj60/6TkBqrYjLKb5nMuB1gLO8pVyIE7Gh5vdZ2ZpVjl7BnAVVO', 'CE1'::grade_level_type, '[]'::jsonb, false, NULL, 1050, 4, 0, 1000, 0, '2026-02-04 12:08:40', NULL)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
    """,
    
    # Import remaining items
    """
    INSERT INTO items (id, name, description, price, effect_type, value, rarity, image) VALUES
        ('atk_r2', 'Potion Attaque (R2)', '+40% Dégâts', 250, 'BUFF_ATK', 40, 'UNCOMMON'::rarity_type, 'attaque.webp'),
        ('atk_r3', 'Attaque ++', '+20 ATK temporaire', 250, 'BUFF_ATK', 20, 'RARE'::rarity_type, 'attaque.webp'),
        ('atk_r4', 'Potion Attaque (R4)', '+80% Dégâts', 900, 'BUFF_ATK', 80, 'EPIC'::rarity_type, 'attaque.webp'),
        ('atk_r5', 'Potion Attaque (R5)', '+100% Dégâts (x2)', 1500, 'BUFF_ATK', 100, 'LEGENDARY'::rarity_type, 'attaque.webp'),
        ('def_r1', 'Défense +', '+10 DEF temporaire', 100, 'BUFF_DEF', 10, 'COMMON'::rarity_type, 'defense.webp'),
        ('def_r2', 'Potion Défense (R2)', 'Bloque 40% Dégâts', 250, 'BUFF_DEF', 40, 'UNCOMMON'::rarity_type, 'defense.webp'),
        ('def_r3', 'Potion Défense (R3)', 'Bloque 60% Dégâts', 500, 'BUFF_DEF', 60, 'RARE'::rarity_type, 'defense.webp'),
        ('def_r4', 'Potion Défense (R4)', 'Bloque 80% Dégâts', 1000, 'BUFF_DEF', 80, 'EPIC'::rarity_type, 'defense.webp'),
        ('def_r5', 'Potion Défense (R5)', 'Immunité (1 tour)', 1500, 'BUFF_DEF', 100, 'LEGENDARY'::rarity_type, 'defense.webp'),
        ('dmg_r1', 'Coup de Poing (R1)', '20% PV Ennemi', 150, 'DMG_FLAT', 20, 'COMMON'::rarity_type, 'coup_poing.webp'),
        ('dmg_r2', 'Coup de Poing (R2)', '40% PV Ennemi', 350, 'DMG_FLAT', 40, 'UNCOMMON'::rarity_type, 'coup_poing.webp'),
        ('dmg_r3', 'Coup de Poing (R3)', '60% PV Ennemi', 650, 'DMG_FLAT', 60, 'RARE'::rarity_type, 'coup_poing.webp'),
        ('dmg_r4', 'Coup de Poing (R4)', '80% PV Ennemi', 1100, 'DMG_FLAT', 80, 'EPIC'::rarity_type, 'coup_poing.webp'),
        ('dmg_r5', 'K.O. Poing', '100% PV Ennemi', 2000, 'DMG_FLAT', 100, 'LEGENDARY'::rarity_type, 'coup_poing.webp'),
        ('evolution', 'Pierre d''Évolution', 'Fait évoluer un Pokémon', 500, 'EVOLUTION', 1, 'RARE'::rarity_type, 'evolution.webp'),
        ('evolution_ultime', 'Gemme Ultime', 'Évolution maximale', 2000, 'EVOLUTION', 3, 'LEGENDARY'::rarity_type, 'evolution.webp'),
        ('heal_r1', 'Potion', '+25% PV', 100, 'HEAL', 25, 'COMMON'::rarity_type, 'potion.webp'),
        ('heal_r2', 'Super Potion', '+50% PV', 250, 'HEAL', 50, 'UNCOMMON'::rarity_type, 'potion.webp'),
        ('heal_r3', 'Hyper Potion', '+75% PV', 500, 'HEAL', 75, 'RARE'::rarity_type, 'potion.webp'),
        ('heal_r4', 'Potion Max', '+90% PV', 900, 'HEAL', 90, 'EPIC'::rarity_type, 'potion.webp'),
        ('heal_r5', 'Guérison Totale', 'PV Max', 1500, 'HEAL', 100, 'LEGENDARY'::rarity_type, 'potion.webp'),
        ('joker', 'Joker', 'Question automatiquement réussie', 1500, 'QUESTION_SUCCESS', 1, 'LEGENDARY'::rarity_type, 'joker.webp'),
        ('mirror_r5', 'Miroir (R5)', 'Renvoie 100% des dégâts', 1500, 'MIRROR', 100, 'LEGENDARY'::rarity_type, 'miroir.webp'),
        ('sleep_r1', 'Poudre Dodo', 'Ennemi passe son tour', 500, 'SLEEP', 1, 'RARE'::rarity_type, 'poudre_dodo.webp'),
        ('team_r5', 'Équipe ++', 'Soigne toute l''équipe (50%)', 1500, 'HEAL_TEAM', 50, 'LEGENDARY'::rarity_type, 'soin_equipe.webp'),
        ('traitor_r1', 'Trahison', 'Capture le Pokémon actif ennemi', 2500, 'TRAITOR', 1, 'LEGENDARY'::rarity_type, 'pokeball.webp')
    ON CONFLICT (id) DO NOTHING;
    """
]

try:
    print(f"Connecting to {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    print("✅ Connected!\n")
    
    for idx, sql in enumerate(sql_commands, 1):
        print(f"📤 Executing command {idx}...")
        
        # Write SQL to temp file
        sftp = client.open_sftp()
        remote_file = f'/tmp/import_data_{idx}.sql'
        with sftp.open(remote_file, 'w') as f:
            f.write(sql)
        sftp.close()
        
        # Execute
        stdin, stdout, stderr = client.exec_command(
            f'sudo -u postgres psql -d poke_edu -f {remote_file}'
        )
        
        output = stdout.read().decode('utf-8')
        errors = stderr.read().decode('utf-8')
        
        if 'ERROR' in errors:
            print(f"❌ Errors:")
            print(errors[:1000])
        else:
            print(f"✅ Success")
            if output.strip():
                print(output[:200])
    
    # Final counts
    print("\n📊 Final database status:")
    stdin, stdout, stderr = client.exec_command('''
        sudo -u postgres psql -d poke_edu -c "
        SELECT 'users' as table, COUNT(*) as count FROM users
        UNION ALL SELECT 'items', COUNT(*) FROM items
        UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
        UNION ALL SELECT 'question_bank', COUNT(*) FROM question_bank;
        "
    ''')
    print(stdout.read().decode('utf-8'))
    
    client.close()
    print("\n✅ Import completed!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
