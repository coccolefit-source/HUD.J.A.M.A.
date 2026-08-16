import re

# src/components/Auth/AuthBanner.tsx
with open("src/components/Auth/AuthBanner.tsx", "r") as f:
    content = f.read()
# The banner is for guest mode, so we just return null always
content = content.replace("if (dismissed || !userSession.isGuest) return null;", "return null;")
with open("src/components/Auth/AuthBanner.tsx", "w") as f:
    f.write(content)

# src/components/Auth/AuthModal.tsx
with open("src/components/Auth/AuthModal.tsx", "r") as f:
    content = f.read()
# Replace {!userSession.isGuest ? ... : authMode === 'recovery'}
content = re.sub(r'\{\!userSession\.isGuest \? \(.*?\) \: authMode === \'recovery\' \? \(', "{authMode === 'recovery' ? (", content, flags=re.DOTALL)
with open("src/components/Auth/AuthModal.tsx", "w") as f:
    f.write(content)

# src/components/Sidebar.tsx
with open("src/components/Sidebar.tsx", "r") as f:
    content = f.read()
content = content.replace("{userSession.isGuest ? 'GUEST_MODE (LOCAL)' : 'ONLINE (CLOUD)'}", "'ONLINE (CLOUD)'")
content = re.sub(r'\{!userSession\.isGuest && \((.*?)\)\}', r'\1', content, flags=re.DOTALL)
with open("src/components/Sidebar.tsx", "w") as f:
    f.write(content)

# src/App.tsx
with open("src/App.tsx", "r") as f:
    content = f.read()
content = content.replace("{!userSession.isGuest ? `ESTADO DE SESIÓN: CONECTADO [${userSession.email}]` : 'OPTIMAL // LATENCY <1ms'}", "`ESTADO DE SESIÓN: CONECTADO [${userSession.email}]`")
content = content.replace("{userSession.isGuest ? 'INVITADO' : `CONECTADO [${userSession.email?.split('@')[0].toUpperCase()}]`}", "`CONECTADO [${userSession.email?.split('@')[0].toUpperCase()}]`")
# Remove AuthBanner
content = re.sub(r'<AuthBanner.*?/>', '', content, flags=re.DOTALL)
with open("src/App.tsx", "w") as f:
    f.write(content)
