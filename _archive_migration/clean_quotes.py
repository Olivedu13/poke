#!/usr/bin/env python3

# Read the file
with open('/workspaces/poke/import_all_questions_final.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix multiple consecutive single quotes
# Replace ''' with '' (triple to double)
content = content.replace("'''", "''")

# Also fix any remaining \'
content = content.replace("\\'", "''")

# Write back
with open('/workspaces/poke/import_all_questions_clean.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleaned quotes in import_all_questions_clean.sql")