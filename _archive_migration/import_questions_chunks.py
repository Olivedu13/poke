#!/usr/bin/env python3
import paramiko
import sys

hostname = '87.106.1.134'
username = 'root'
password = 'rzoP3HCG'

# Read questions
questions = []
with open('/workspaces/poke/import_all_questions_json_fixed.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract individual INSERT statements (this is complex, let's try a different approach)
# For now, let's just count how many questions we have and import them in batches

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(hostname, username=username, password=password, timeout=10)
    
    # First, let's see current count
    stdin, stdout, stderr = client.exec_command('sudo -u postgres psql -d poke_edu -t -c "SELECT COUNT(*) FROM question_bank;"')
    current_count = int(stdout.read().decode('utf-8').strip())
    print(f"Current questions: {current_count}")
    
    # Try to import in smaller chunks
    # Split the file into smaller parts
    with open('/workspaces/poke/import_all_questions_json_fixed.sql', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find INSERT statement and split into smaller chunks
    insert_start = -1
    values_start = -1
    for i, line in enumerate(lines):
        if 'INSERT INTO question_bank' in line:
            insert_start = i
        if 'VALUES' in line and insert_start != -1:
            values_start = i
            break
    
    if insert_start == -1 or values_start == -1:
        print("Could not find INSERT statement")
        sys.exit(1)
    
    # Get the VALUES part
    values_lines = lines[values_start:]
    
    # Split into chunks of 50 questions each
    chunk_size = 50
    chunks = []
    current_chunk = []
    question_count = 0
    
    for line in values_lines:
        current_chunk.append(line)
        if line.strip().endswith('),') or line.strip().endswith(');'):
            question_count += 1
            if question_count % chunk_size == 0:
                chunks.append(''.join(current_chunk))
                current_chunk = []
    
    if current_chunk:
        chunks.append(''.join(current_chunk))
    
    print(f"Split into {len(chunks)} chunks")
    
    # Import each chunk
    imported = 0
    for i, chunk in enumerate(chunks):
        print(f"Importing chunk {i+1}/{len(chunks)}...")
        
        # Create temp file with chunk
        chunk_sql = lines[insert_start] + lines[values_start].replace('VALUES', f'VALUES {chunk}').replace('ON CONFLICT', '')
        
        # Write chunk to temp file
        with open(f'/tmp/chunk_{i}.sql', 'w', encoding='utf-8') as f:
            f.write(chunk_sql)
        
        # Upload and execute
        sftp = client.open_sftp()
        remote_file = f'/tmp/chunk_{i}.sql'
        with sftp.open(remote_file, 'w') as f:
            f.write(chunk_sql)
        sftp.close()
        
        # Execute
        stdin, stdout, stderr = client.exec_command(f'sudo -u postgres psql -d poke_edu -f {remote_file}')
        errors = stderr.read().decode('utf-8')
        
        if 'ERROR' in errors:
            print(f"Errors in chunk {i+1}:")
            print(errors[:500])
        else:
            imported += chunk_size
            print(f"✅ Chunk {i+1} imported")
    
    # Final count
    stdin, stdout, stderr = client.exec_command('sudo -u postgres psql -d poke_edu -t -c "SELECT COUNT(*) FROM question_bank;"')
    final_count = int(stdout.read().decode('utf-8').strip())
    print(f"\nFinal questions count: {final_count} (added {final_count - current_count})")
    
    client.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)