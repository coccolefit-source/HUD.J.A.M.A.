with open("src/components/Auth/AuthModal.tsx", "r") as f:
    lines = f.readlines()
    
with open("src/components/Auth/AuthModal.tsx", "w") as f:
    for line in lines:
        if "onSignOut,  isClosable = true?: () => void;" in line:
            f.write("  onSignOut?: () => void;\n")
        else:
            f.write(line)
