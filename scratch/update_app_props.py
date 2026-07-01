import os

app_path = r"e:\diploma-operations-assistant (3)\src\App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace InstructorsManager
old_inst = """                          <InstructorsManager
                            instructors={instructors}
                            onSaveInstructors={handleSaveInstructors}
                            isAdmin={isAdmin}
                            diplomas={diplomas}
                          />"""

new_inst = """                          <InstructorsManager
                            instructors={instructors}
                            onSaveInstructors={handleSaveInstructors}
                            isAdmin={isAdmin}
                            diplomas={diplomas}
                            sessions={sessions}
                          />"""

# Replace MentorsManager
old_ment = """                          <MentorsManager
                            mentors={mentors}
                            onSaveMentors={handleSaveMentors}
                            isAdmin={isAdmin}
                            diplomas={diplomas}
                          />"""

new_ment = """                          <MentorsManager
                            mentors={mentors}
                            onSaveMentors={handleSaveMentors}
                            isAdmin={isAdmin}
                            diplomas={diplomas}
                            sessions={sessions}
                          />"""

content = content.replace(old_inst, new_inst)
content = content.replace(old_ment, new_ment)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx successfully updated with sessions props!")
