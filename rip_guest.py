import os
import re

def remove_guest_from_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove isGuest: true or isGuest: false everywhere
    content = re.sub(r'isGuest:\s*(true|false),?\s*', '', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            remove_guest_from_file(os.path.join(root, file))

