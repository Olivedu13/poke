#!/usr/bin/env python3

# Read the file
with open('/workspaces/poke/import_all_questions_clean.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix JSON: replace \" with "
content = content.replace('\\"', '"')

# Write back
with open('/workspaces/poke/import_all_questions_json_fixed.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed JSON quotes in import_all_questions_json_fixed.sql")