import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Fix the broken props in Sidebar
content = content.replace("onSignOut={handleSignOut}\n          isClosable={false}\n      />", "onSignOut={handleSignOut}\n      />")

# Remove AuthModal from the main app layout entirely because it's in the !isAuthenticated guard
auth_modal_pattern = r'\{/\*\s*Tactical Auth & Session Modal\s*\*/\}\s*<AuthModal.*?\/>'
content = re.sub(auth_modal_pattern, '', content, flags=re.DOTALL)

# Remove the leftover ResetPasswordModal from the bottom too, as it's also in the guard
reset_modal_pattern = r'\{/\*\s*Password Recovery Modal\s*\*/\}\s*<ResetPasswordModal.*?\/>'
content = re.sub(reset_modal_pattern, '', content, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(content)

