with open("src/App.tsx") as f:
    lines = f.readlines()

o = 0
for lnum, line in enumerate(lines):
    for c in line:
        if c == '{': o += 1
        elif c == '}': o -= 1
    if o < 0:
        print(f"Negative balance at line {lnum+1}: {line.strip()}")
        o = 0
print(f"Final balance: {o}")
