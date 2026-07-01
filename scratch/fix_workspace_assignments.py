import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract the assignments code block from the top
start_marker = "  // Assignments & Project Tracker states"
end_marker = "  const handleUpdateSubmission = (assignId: string, studentId: string, submitted: boolean, grade?: number, notes?: string) => {\n    if (!diploma) return;\n    const existing = diploma.assignments || [];\n    const updated = existing.map(a => {\n      if (a.id === assignId) {\n        const subs = { ...a.submissions };\n        subs[studentId] = {\n          submitted,\n          submittedAt: submitted ? (subs[studentId]?.submittedAt || new Date().toISOString().split('T')[0]) : undefined,\n          grade: grade !== undefined ? Math.min(a.maxGrade, Math.max(0, grade)) : undefined,\n          notes: notes !== undefined ? notes : subs[studentId]?.notes\n        };\n        return { ...a, submissions: subs };\n      }\n      return a;\n    });\n    const updatedDiplomas = diplomas.map(d => d.id === diploma.id ? { ...d, assignments: updated } : d);\n    onSaveDiplomas(updatedDiplomas);\n  };"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_marker)
    extracted_block = content[start_idx:end_idx]
    
    # Remove from original position
    content = content[:start_idx] + content[end_idx:]
    
    # Insert after diplomaAttendanceStats memo definition
    target_memo_end = """    const totalMarked = presentCount + absentCount;
    const rate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;
    return { rate, presentCount, absentCount, totalMarked };
  }, [enrolledSessions]);"""

    memo_idx = content.find(target_memo_end)
    if memo_idx != -1:
        memo_idx += len(target_memo_end)
        content = content[:memo_idx] + "\n\n  " + extracted_block + content[memo_idx:]
    else:
        print("Error: Target memo end not found!")
else:
    print("Error: Extracted block not found or already moved!")

# 2. Fix the typing: Object.values(a.submissions || {}) as AssignmentSubmission[]
# Let's replace the submissions rate check line:
# const submissionsArr = Object.values(a.submissions || {});
old_subs_val = "const submissionsArr = Object.values(a.submissions || {});"
new_subs_val = "const submissionsArr = Object.values(a.submissions || {}) as AssignmentSubmission[];"
content = content.replace(old_subs_val, new_subs_val)

with open(workspace_path, "w", encoding="utf-8") as f:
    f.write(content)

print("DiplomaWorkspace.tsx successfully fixed!")
