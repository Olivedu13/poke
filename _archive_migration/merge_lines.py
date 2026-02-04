#!/usr/bin/env python3

# Read the file
with open('/workspaces/poke/import_all_questions_json_fixed.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    # Check if line starts with quote but doesn't end with quote + comma
    if line.startswith("''") and not (line.endswith("',") or line.endswith("')")):
        # This is an incomplete line, merge with next line
        next_line = lines[i+1].strip() if i+1 < len(lines) else ""
        if next_line:
            # Merge and add closing quote
            merged = line + " " + next_line.rstrip("',") + "'"
            fixed_lines.append(merged)
            i += 2  # Skip next line
            continue
    fixed_lines.append(line)
    i += 1

# Write back
with open('/workspaces/poke/import_all_questions_final.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed_lines))

print("Merged incomplete lines in import_all_questions_final.sql")