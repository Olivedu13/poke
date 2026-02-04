#!/usr/bin/env python3

# Read the file
with open('/workspaces/poke/import_all_questions_v2.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escaping
content = content.replace("\\'", "''")

# Write back
with open('/workspaces/poke/import_all_questions_final.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed escaping in import_all_questions_final.sql")