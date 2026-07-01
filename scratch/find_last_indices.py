import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find all occurrences of "  );\n}"
import re
matches = [m.start() for m in re.finditer(r"\n  \);\n\}", content)]
print(f"Total occurrences of '\\n  );\\n}}': {len(matches)}")
for idx in matches:
    # Print 20 characters before and 20 after
    print(f"Index {idx}: ... {repr(content[idx-50:idx+20])} ...")
