import re

with open("src/components/Sidebar.tsx", "r") as f:
    content = f.read()

# Remove onOpenAuthModal from props interface
content = re.sub(r'\s*onOpenAuthModal\?:\s*\(\)\s*=>\s*void;', '', content)
# Remove it from destructuring
content = re.sub(r'\s*onOpenAuthModal,', '', content)
# Remove from onClick
content = content.replace("onClick={onOpenAuthModal}", "")
# Remove the empty button if needed, but it's just a button without action. Let's leave it without onClick or make it just a div.
# But actually the user wanted "BORRA O DESCONECTA permanentemente el estado 'guestMode' o 'isGuest = true' del almacenamiento local (localStorage) y de los hooks iniciales." 
# I already did that.

with open("src/components/Sidebar.tsx", "w") as f:
    f.write(content)

with open("src/App.tsx", "r") as f:
    app_content = f.read()

# Remove onOpenAuthModal from Sidebar call in App.tsx
app_content = re.sub(r'\s*onOpenAuthModal=\{.*?\}', '', app_content)

with open("src/App.tsx", "w") as f:
    f.write(app_content)

