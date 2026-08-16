import sys

with open("src/components/Auth/AuthModal.tsx", "r") as f:
    content = f.read()

# Find the start of Navigation Tabs
start_idx = content.find("{/* Navigation Tabs */}")
# Find the start of account content
account_idx = content.find("{activeTab === 'account' && (")
# Find the end of account content (just before Modal Footer)
end_account_idx = content.find("{/* Modal Footer */}")

if start_idx != -1 and account_idx != -1 and end_account_idx != -1:
    account_content_start = content.find("<div className=\"space-y-4\">", account_idx)
    # the closing brace for the account tab content is right before </div> and {/* Modal Footer */}
    
    # We want to replace from start_idx up to account_content_start with just:
    new_top = """{/* Auth Content Body */}
          <div className="p-6 space-y-5">
            """
            
    # Remove the `)}` that closed `activeTab === 'account' && (`
    footer_idx = content.find("</div>\n\n          {/* Modal Footer */}")
    
    final_content = content[:start_idx] + new_top + content[account_content_start:footer_idx] + "\n" + content[footer_idx:]
    final_content = final_content.replace("{activeTab === 'account' && (", "")
    
    # Remove unused states and imports if any, but it's fine
    
    with open("src/components/Auth/AuthModal.tsx", "w") as f:
        f.write(final_content)
    print("Patched successfully")
else:
    print("Could not find markers")
