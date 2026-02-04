#!/usr/bin/env python3
import re

with open('/workspaces/poke/dbs15241915.sql', 'r') as f:
    content = f.read()

# Find all INSERT INTO statements
inserts = re.findall(r'INSERT INTO `.*?`.*?;', content, re.DOTALL)

# Replace backticks with double quotes
converted_inserts = []
for insert in inserts:
    # Replace `table` with "table"
    insert = re.sub(r'`([^`]+)`', r'"\1"', insert)
    converted_inserts.append(insert)

# Write to output file
with open('/workspaces/poke/dbs_inserts_only.sql', 'w') as f:
    for insert in converted_inserts:
        f.write(insert + '\n')

print(f"Extracted {len(converted_inserts)} INSERT statements.")