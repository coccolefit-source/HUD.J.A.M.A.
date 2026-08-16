with open("src/App.tsx") as f:
    text = f.read()
    
o = 0
for i, c in enumerate(text):
    if c == '{': o += 1
    elif c == '}': o -= 1
    if o < 0:
        print(f"Mismatched at {i}")
        break
print(f"Final: {o}")
