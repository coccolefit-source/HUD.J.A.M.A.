with open("src/App.tsx") as f:
    lines = f.readlines()

o = 0
for lnum, line in enumerate(lines):
    for c in line:
        if c == '{': o += 1
        elif c == '}': o -= 1
    if o == 0 and lnum > 100 and lnum < len(lines)-5:
        print(f"Hit 0 balance at line {lnum+1}: {line.strip()}")
