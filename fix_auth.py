import sys
import re

with open("src/components/Auth/AuthModal.tsx", "r") as f:
    content = f.read()

# Fix handleSwitchToGuest syntax
content = content.replace("""  const handleSwitchToGuest = () => {
    if (onSignOut,
  isClosable = true) {
      onSignOut,
  isClosable = true();
    } else {""", """  const handleSwitchToGuest = () => {
    if (onSignOut) {
      onSignOut();
    } else {""")
    
# Or maybe it looks like this:
content = re.sub(r"if \(onSignOut,.*?isClosable = true\) \{.*?onSignOut,.*?isClosable = true\(\);\n\s*\}", 
"""if (onSignOut) {
      onSignOut();
    }""", content, flags=re.DOTALL)

# Fix "VOLVER A INVITADO"
content = content.replace("[ CERRAR SESIÓN / VOLVER A INVITADO ]", "[ CERRAR SESIÓN ]")

with open("src/components/Auth/AuthModal.tsx", "w") as f:
    f.write(content)

