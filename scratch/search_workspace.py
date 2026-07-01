import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "TAB 4: GOOGLE SHEETS INTEGRATION" in line:
        # print 10 lines before and after
        for j in range(max(0, i-15), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j]}", end="")
        break
