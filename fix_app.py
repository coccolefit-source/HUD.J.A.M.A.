import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Fix duplicates added by sed if any
import re
content = re.sub(r'isClosable=\{false\}\n\s*isClosable=\{false\}\n\s*isClosable=\{false\}', 'isClosable={false}', content)
content = re.sub(r'isClosable=\{false\}\n\s*isClosable=\{false\}', 'isClosable={false}', content)

with open("src/App.tsx", "w") as f:
    f.write(content)
