import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r"enrolledStudents\.length\s*===\s*0", content)]
print(f"Total occurrences of 'enrolledStudents.length === 0': {len(matches)}")
for idx in matches:
    print(f"Index {idx}: ... {repr(content[idx-50:idx+50])} ...")
