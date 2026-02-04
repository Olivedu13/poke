#!/usr/bin/env python3
import re

# Read the original MySQL dump
with open('/workspaces/poke/dbs15241915.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all INSERT INTO statements with proper multi-line handling
inserts = []

# Match INSERT INTO statements, capturing table name and values
pattern = r"INSERT INTO `([^`]+)`\s*\([^)]+\)\s*VALUES\s*(.*?);"
matches = re.findall(pattern, content, re.DOTALL)

for table, values in matches:
    # Replace backticks with double quotes for table/column names
    insert = f'INSERT INTO "{table}"'
    
    # Get the column names
    col_pattern = r"INSERT INTO `" + re.escape(table) + r"`\s*\(([^)]+)\)\s*VALUES"
    col_match = re.search(col_pattern, content, re.DOTALL)
    if col_match:
        columns = col_match.group(1)
        # Replace backticks in column names
        columns = re.sub(r'`([^`]+)`', r'"\1"', columns)
        insert += f' ({columns})'
    
    # Clean the values: escape single quotes properly for PostgreSQL
    # PostgreSQL uses '' to escape single quotes, not \'
    values = values.replace("\\'", "''")
    values = values.replace('\\n', '\n')
    values = values.replace('\\r', '\r')
    values = values.replace('\\t', '\t')
    
    insert += f' VALUES {values};'
    inserts.append((table, insert))

# Group by table
tables_data = {}
for table, insert in inserts:
    if table not in tables_data:
        tables_data[table] = []
    tables_data[table].append(insert)

# Write separate files per table
for table, table_inserts in tables_data.items():
    filename = f'/workspaces/poke/inserts_{table}.sql'
    with open(filename, 'w', encoding='utf-8') as f:
        # Add table clearing (optional, comment out if not needed)
        # f.write(f'DELETE FROM "{table}";\n\n')
        for insert in table_inserts:
            f.write(insert + '\n')
    print(f"Created {filename} with {len(table_inserts)} INSERT(s)")

print(f"\nTotal tables: {len(tables_data)}")
print(f"Tables: {', '.join(tables_data.keys())}")
