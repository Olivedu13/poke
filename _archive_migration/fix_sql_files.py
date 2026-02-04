#!/usr/bin/env python3
import re
import os

def convert_mysql_to_postgres(sql_content):
    """Convert MySQL INSERT to PostgreSQL compatible format"""
    
    # Fix JSON: replace \" with "
    sql_content = sql_content.replace('\\"', '"')
    
    # Fix booleans: replace 0/1 with FALSE/TRUE in specific boolean columns
    # Pattern: match values that are clearly boolean (0 or 1 followed by comma or closing paren)
    
    # For custom_prompt_active, is_team, waiting_for_answer, is_correct columns
    # We need to be careful to only replace in the right positions
    
    # More robust approach: replace the actual values in INSERT statements
    lines = sql_content.split('\n')
    result_lines = []
    
    for line in lines:
        if 'INSERT INTO' in line:
            # Replace boolean-like values
            # Pattern: ', 0,' or ', 1,' in value lists
            # But preserve numeric IDs and actual numbers
            
            # Custom replacement for known boolean patterns in specific positions
            line = re.sub(r"(custom_prompt_active.*?), ([01]),", r"\1, \2::boolean,", line)
            line = re.sub(r"(is_team.*?), ([01]),", r"\1, \2::boolean,", line)
            line = re.sub(r"(waiting_for_answer.*?), ([01]),", r"\1, \2::boolean,", line)
            line = re.sub(r"(is_correct.*?), ([01]),", r"\1, \2::boolean,", line)
            
            # Alternative: replace in VALUES section more carefully
            # This is tricky - let's use a different approach
            
        result_lines.append(line)
    
    return '\n'.join(result_lines)

def fix_sql_file(input_file, output_file):
    """Fix a SQL file for PostgreSQL compatibility"""
    print(f"Processing {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Convert
    fixed_content = convert_mysql_to_postgres(content)
    
    # Write
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"  → Fixed version saved to {output_file}")

# Process all table files
tables = [
    'users',
    'items',
    'user_pokemon',
    'inventory',
    'question_bank',
    'pvp_challenges',
    'pvp_matches',
    'pvp_turns',
    'online_players'
]

for table in tables:
    input_file = f'/workspaces/poke/inserts_{table}.sql'
    output_file = f'/workspaces/poke/inserts_{table}_fixed.sql'
    
    if os.path.exists(input_file):
        fix_sql_file(input_file, output_file)
    else:
        print(f"⚠️  {input_file} not found")

print("\n✅ All files processed!")
