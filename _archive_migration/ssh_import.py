#!/usr/bin/env python3
import paramiko
import sys

# Connection parameters
hostname = '87.106.1.134'
username = 'root'
password = 'rzoP3HCG'

# Create SSH client
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    # Connect with password
    print(f"Connecting to {hostname}...")
    client.connect(hostname, username=username, password=password, timeout=10)
    print("Connected successfully!")
    
    # Read the SQL file
    with open('/workspaces/poke/dbs_inserts_only.sql', 'r') as f:
        sql_content = f.read()
    
    # Upload the SQL file
    print("Uploading SQL file...")
    sftp = client.open_sftp()
    with sftp.open('/tmp/dbs_inserts_only.sql', 'w') as remote_file:
        remote_file.write(sql_content)
    sftp.close()
    print("SQL file uploaded to /tmp/dbs_inserts_only.sql")
    
    # Execute the SQL file
    print("Executing SQL on PostgreSQL...")
    stdin, stdout, stderr = client.exec_command('sudo -u postgres psql -d poke_edu -f /tmp/dbs_inserts_only.sql')
    
    output = stdout.read().decode('utf-8')
    errors = stderr.read().decode('utf-8')
    
    if output:
        print("Output:")
        print(output)
    if errors:
        print("Errors:")
        print(errors)
    
    # Check the results
    print("\nChecking inserted data...")
    stdin, stdout, stderr = client.exec_command('sudo -u postgres psql -d poke_edu -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM items; SELECT COUNT(*) FROM inventory;"')
    print(stdout.read().decode('utf-8'))
    
    client.close()
    print("\nDone!")
    
except paramiko.AuthenticationException:
    print(f"ERROR: Authentication failed. Password incorrect for user {username}")
    sys.exit(1)
except paramiko.SSHException as e:
    print(f"ERROR: SSH connection failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
