import re
with open("src/App.tsx", "r") as f:
    text = f.read()
text = re.sub(r'const handleToggleHabit = async\s+const habitId', 'const handleToggleHabit = async (arg1: string, arg2?: string) => {\n    const habitId', text)
with open("src/App.tsx", "w") as f:
    f.write(text)
