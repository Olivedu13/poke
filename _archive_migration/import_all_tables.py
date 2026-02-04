#!/usr/bin/env python3
import paramiko
import sys
import os

# Connection parameters
hostname = '87.106.1.134'
username = 'root'
password = 'rzoP3HCG'

# Tables to import (in order to respect foreign keys)
tables = [
    'users',
    'items',
    'user_pokemon',
    'inventory',
    'question_bank',
    'online_players',
    'pvp_challenges',
    'pvp_matches',
    'pvp_turns'
]

# Create SSH client
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    # Connect
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password, timeout=10)
    print("✅ Connected successfully!\n")
    
    for table in tables:
        sql_file = f'/workspaces/poke/inserts_{table}.sql'
        
        if not os.path.exists(sql_file):
            print(f"⚠️  {table}: File not found, skipping")
            continue
            
        print(f"📤 Importing {table}...")
        
        # Read the SQL file
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Upload the SQL file
        sftp = client.open_sftp()
        remote_file = f'/tmp/inserts_{table}.sql'
        with sftp.open(remote_file, 'w') as f:
            f.write(sql_content)
        sftp.close()
        
        # Execute the SQL file
        stdin, stdout, stderr = client.exec_command(
            f'sudo -u postgres psql -d poke_edu -f {remote_file}'
        )
        
        output = stdout.read().decode('utf-8')
        errors = stderr.read().decode('utf-8')
        
        if 'ERROR' in errors or 'error' in errors.lower():
            print(f"❌ {table}: Errors during import")
            print(errors[:500])  # Show first 500 chars of errors
        else:
            # Count rows
            stdin, stdout, stderr = client.exec_command(
                f'sudo -u postgres psql -d poke_edu -t -c "SELECT COUNT(*) FROM {table};"'
            )
            count = stdout.read().decode('utf-8').strip()
            print(f"✅ {table}: Imported successfully ({count} rows total)")
    
    print("\n📊 Final counts:")
    stdin, stdout, stderr = client.exec_command('''
        sudo -u postgres psql -d poke_edu -c "
        SELECT 'users' as table, COUNT(*) FROM users
        UNION ALL SELECT 'items', COUNT(*) FROM items
        UNION ALL SELECT 'inventory', COUNT(*) FROM inventory
        UNION ALL SELECT 'user_pokemon', COUNT(*) FROM user_pokemon
        UNION ALL SELECT 'question_bank', COUNT(*) FROM question_bank
        UNION ALL SELECT 'pvp_matches', COUNT(*) FROM pvp_matches
        UNION ALL SELECT 'pvp_turns', COUNT(*) FROM pvp_turns;
        "
    ''')
    print(stdout.read().decode('utf-8'))
    
    client.close()
    print("\n✅ Migration completed!")
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
