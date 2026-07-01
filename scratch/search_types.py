import os

types_path = r"e:\diploma-operations-assistant (3)\src\types.ts"
with open(types_path, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("interface Diploma")
if idx != -1:
    print(content[idx:idx+600])
else:
    print("Diploma not found")
