import os

session_path = r"e:\diploma-operations-assistant (3)\src\components\SessionManager.tsx"
with open(session_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "instructor" in line.lower():
        print(f"Line {i+1}: {line.strip()}")
