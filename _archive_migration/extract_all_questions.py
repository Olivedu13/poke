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

# Create PostgreSQL compatible INSERT
postgres_inserts = []

for i, question in enumerate(all_questions, 1):
    # Parse the question values
    # Format: id, 'subject', 'grade_level', 'difficulty', 'category', 'question_text', 'options_json', correct_index, 'explanation'
    
    # Replace MySQL escaping with PostgreSQL
    question = question.replace("\\'", "''")  # MySQL \' -> PostgreSQL ''
    question = question.replace('\\"', '"')   # Fix JSON quotes
    
    # Add proper type casting for ENUMs
    parts = []
    in_string = False
    current_part = ""
    
    for char in question:
        if char == "'" and (not current_part.endswith('\\') or current_part.endswith('\\\\')):
            in_string = not in_string
        elif char == ',' and not in_string:
            parts.append(current_part.strip())
            current_part = ""
            continue
        current_part += char
    
    if current_part.strip():
        parts.append(current_part.strip())
    
    if len(parts) >= 9:
        # Format for PostgreSQL
        pg_question = f"""(
    {parts[0]}, 
    '{parts[1]}', 
    '{parts[2]}'::grade_level_type, 
    '{parts[3]}'::difficulty_type, 
    '{parts[4]}', 
    '{parts[5]}', 
    '{parts[6]}'::jsonb, 
    {parts[7]}, 
    '{parts[8]}'
)"""
        postgres_inserts.append(pg_question)

# Create the final SQL
sql_header = """-- Import all questions from MySQL dump
INSERT INTO question_bank (id, subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) VALUES"""

sql_content = sql_header + "\n" + ",\n".join(postgres_inserts) + "\nON CONFLICT (id) DO NOTHING;"

# Write to file
with open('/workspaces/poke/import_all_questions.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)

print(f"Created import_all_questions.sql with {len(postgres_inserts)} questions")

# Also create a count check
count_sql = f"""
-- Check final count
SELECT COUNT(*) as total_questions FROM question_bank;
"""
with open('/workspaces/poke/check_questions.sql', 'w', encoding='utf-8') as f:
    f.write(count_sql)