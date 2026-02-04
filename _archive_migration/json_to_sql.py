import json

# Map for enum types in PostgreSQL
GRADE_LEVELS = [
    'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6EME', '5EME', '4EME', '3EME', '2NDE', '1ERE', 'TERMINALE'
]
DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD']

with open('/workspaces/poke/question_bank.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

with open('/workspaces/poke/import_questions_from_json.sql', 'w', encoding='utf-8') as f:
    f.write('-- Insert questions from question_bank.json\n')
    for q in questions:
        # Prepare values
        id = int(q['id'])
        subject = q['subject'].replace("'", "''")
        grade_level = q['grade_level']
        difficulty = q['difficulty']
        category = q['category'].replace("'", "''")
        question_text = q['question_text'].replace("'", "''")
        options_json = q['options_json'].replace("'", "''")
        correct_index = int(q['correct_index'])
        explanation = q['explanation'].replace("'", "''")
        # Compose SQL
        sql = f"INSERT INTO question_bank (id, subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) VALUES ("
        sql += f"{id}, "
        sql += f"'{subject}', "
        sql += f"'{grade_level}'::grade_level_type, "
        sql += f"'{difficulty}'::difficulty_type, "
        sql += f"'{category}', "
        sql += f"'{question_text}', "
        sql += f"'{options_json}'::jsonb, "
        sql += f"{correct_index}, "
        sql += f"'{explanation}');\n"
        f.write(sql)
print('SQL file created: import_questions_from_json.sql')
