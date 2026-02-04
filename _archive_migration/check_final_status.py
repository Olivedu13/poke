#!/usr/bin/env python3
import paramiko

hostname = '87.106.1.134'
username = 'root'
password = 'rzoP3HCG'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(hostname, username=username, password=password, timeout=10)
    
    print("📊 État final de la base de données PostgreSQL:\n")
    
    stdin, stdout, stderr = client.exec_command('''
        sudo -u postgres psql -d poke_edu -c "
        SELECT 
            'users' as table_name, 
            COUNT(*) as row_count,
            pg_size_pretty(pg_total_relation_size('users')) as size
        FROM users
        UNION ALL
        SELECT 'items', COUNT(*), pg_size_pretty(pg_total_relation_size('items')) FROM items
        UNION ALL
        SELECT 'inventory', COUNT(*), pg_size_pretty(pg_total_relation_size('inventory')) FROM inventory
        UNION ALL
        SELECT 'user_pokemon', COUNT(*), pg_size_pretty(pg_total_relation_size('user_pokemon')) FROM user_pokemon
        UNION ALL
        SELECT 'question_bank', COUNT(*), pg_size_pretty(pg_total_relation_size('question_bank')) FROM question_bank
        UNION ALL
        SELECT 'pvp_matches', COUNT(*), pg_size_pretty(pg_total_relation_size('pvp_matches')) FROM pvp_matches
        UNION ALL
        SELECT 'pvp_turns', COUNT(*), pg_size_pretty(pg_total_relation_size('pvp_turns')) FROM pvp_turns
        ORDER BY table_name;
        "
    ''')
    print(stdout.read().decode('utf-8'))
    
    print("\n👥 Liste des utilisateurs importés:\n")
    stdin, stdout, stderr = client.exec_command('''
        sudo -u postgres psql -d poke_edu -c "
        SELECT id, username, grade_level, gold, tokens, global_xp 
        FROM users 
        ORDER BY id;
        "
    ''')
    print(stdout.read().decode('utf-8'))
    
    client.close()
    print("✅ Migration des données MySQL → PostgreSQL terminée!")
    
except Exception as e:
    print(f"ERROR: {e}")
