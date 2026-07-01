import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

bulk_idx = content.find("{/* Feature 3: Bulk WhatsApp Message button */}")
if bulk_idx == -1:
    print("Error: Feature 3 comment not found!")
    exit(1)

start_idx = content.find("{enrolledStudents.map((st) => (", bulk_idx)
end_idx = content.find("{enrolledStudents.length === 0", start_idx)

print(f"bulk_idx: {bulk_idx}")
print(f"start_idx: {start_idx}")
print(f"end_idx: {end_idx}")

if start_idx == -1 or end_idx == -1:
    print("Error: start or end idx not found!")
    exit(1)

old_block = content[start_idx:end_idx]
print("--- OLD BLOCK START ---")
print(old_block[:300])
print("...")
print(old_block[-300:])
print("--- OLD BLOCK END ---")
