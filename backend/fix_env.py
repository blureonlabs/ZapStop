
#!/usr/bin/env python3
"""
Fix the .env file by removing the 'psql' prefix from DATABASE_URL
"""

import os

def fix_env_file():
    env_file = '.env'
    
    # Read the current .env file
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Remove the 'psql ' prefix from DATABASE_URL
    fixed_content = content.replace('psql ', '')
    
    # Write the fixed content back
    with open(env_file, 'w') as f:
        f.write(fixed_content)
    
    print("✅ Fixed .env file - removed 'psql' prefix from DATABASE_URL")

if __name__ == "__main__":
    fix_env_file()

