import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(180, 220):
    print(f"{i+1}: {lines[i]}", end="")
