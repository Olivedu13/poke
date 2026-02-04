#!/usr/bin/env python3
import re

# Read the MySQL dump
with open('/workspaces/poke/dbs15241915.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all question_bank INSERT statements
question_inserts = re.findall(r'INSERT INTO `question_bank`.*?VALUES\s*(.*?);', content, re.DOTALL)

all_questions = []

for insert_block in question_inserts:
    # Split by ),( to get individual question tuples
    questions = re.findall(r'\((.*?)\)', insert_block)

    for q in questions:
        # Clean up the question data
        q = q.strip()
        if q:
            all_questions.append(q)

print(f"Total questions found: {len(all_questions)}")

# Create PostgreSQL compatible INSERT with proper escaping
postgres_inserts = []

for i, question in enumerate(all_questions, 1):
    # Parse the question values more carefully
    # Split by comma but respect quotes
    parts = []
    current_part = ""
    in_string = False
    paren_depth = 0

    for char in question:
        if char == "'" and not current_part.endswith('\\'):
            in_string = not in_string
        elif char == '(' and not in_string:
            paren_depth += 1
        elif char == ')' and not in_string:
            paren_depth -= 1
        elif char == ',' and not in_string and paren_depth == 0:
            parts.append(current_part.strip())
            current_part = ""
            continue
        current_part += char

    if current_part.strip():
        parts.append(current_part.strip())

    if len(parts) >= 9:
        # Clean each part
        cleaned_parts = []
        for part in parts:
            part = part.strip()
            # Remove surrounding quotes if present
            if part.startswith("'") and part.endswith("'"):
                part = part[1:-1]
            # Escape single quotes for PostgreSQL
            part = part.replace("'", "''")
            cleaned_parts.append(part)

        # Format for PostgreSQL
        pg_question = f"""(
    {cleaned_parts[0]},
    '{cleaned_parts[1]}',
    '{cleaned_parts[2]}'::grade_level_type,
    '{cleaned_parts[3]}'::difficulty_type,
    '{cleaned_parts[4]}',
    '{cleaned_parts[5]}',
    '{cleaned_parts[6]}'::jsonb,
    {cleaned_parts[7]},
    '{cleaned_parts[8]}'
)"""
        postgres_inserts.append(pg_question)

# Create the final SQL
sql_header = """-- Import all questions from MySQL dump
INSERT INTO question_bank (id, subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) VALUES"""

sql_content = sql_header + "\n" + ",\n".join(postgres_inserts) + "\nON CONFLICT (id) DO NOTHING;"

# Write to file
with open('/workspaces/poke/import_all_questions_v2.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)

print(f"Created import_all_questions_v2.sql with {len(postgres_inserts)} questions")