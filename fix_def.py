with open("src/App.tsx", "r") as f:
    text = f.read()
text = text.replace("const handleToggleHabit = async    const habitId", "const handleToggleHabit = async (arg1: string, arg2?: string) => {\n    const habitId")
with open("src/App.tsx", "w") as f:
    f.write(text)
