import os
import re

app_path = r"e:\diploma-operations-assistant (3)\src\App.tsx"
assistant_path = r"e:\diploma-operations-assistant (3)\src\components\AIAssistant.tsx"

# 1. Update App.tsx
with open(app_path, "r", encoding="utf-8") as f:
    app_content = f.read()

# Replace tab view
old_tab_view = """                {activeTab === 'ai-assistant' && (
                  <div className="bg-[#0B0B0E] p-8 rounded-2xl border border-zinc-900 text-right space-y-6 max-w-2xl mx-auto font-sans shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-indigo-400 mx-auto animate-bounce">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-2 text-center">
                      <h2 className="text-lg font-black text-white">مساعد سيد الذكي العائم نشط الآن 🤖</h2>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                        لقد قمنا بترقية المساعد الذكي ليصبح عائماً بالكامل! يمكنك الآن استخدامه من أي شاشة أو مساحة عمل داخل النظام دون أن تفقد مكانك.
                      </p>
                    </div>

                    <div className="bg-[#050508]/60 border border-zinc-900 p-4 rounded-xl space-y-3 text-xs leading-relaxed text-zinc-350">
                      <span className="font-bold text-indigo-400 block">⚡ ماذا يمكنك أن تفعل به؟</span>
                      <ul className="space-y-1.5 pr-4 list-disc list-inside">
                        <li>توليد شهادات تخرّج احترافية بالإنجليزية فوراً.</li>
                        <li>جدولة تذكيرات المحاضرات ورسائل الغياب التلقائية على الواتساب.</li>
                        <li>تلخيص المهام التشغيلية وقوائم العمل اليومية للمنسقين.</li>
                        <li>جدولة المحاضرات وتوليد السجلات الأكاديمية بنقرة زر.</li>
                      </ul>
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('TOGGLE_SAYED_AI'));
                        }}
                        className="px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        افتح لوحة المحادثة العائمة الآن 💬
                      </button>
                    </div>
                  </div>
                )}"""

new_tab_view = """                {activeTab === 'ai-assistant' && (
                  <AIAssistant
                    mode="embedded"
                    currentUser={currentUser}
                    students={students}
                    diplomas={diplomas}
                    sessions={sessions}
                    tasks={tasks}
                    config={config}
                    instructors={instructors}
                    diplomaTypes={diplomaTypes}
                    onNavigateToSettings={() => setActiveTab('settings')}
                    onSaveDiplomas={handleSaveDiplomas}
                    onSaveStudents={handleSaveStudents}
                    onSaveSessions={handleSaveSessions}
                    onSaveTasks={handleSaveTasks}
                    onSaveConfig={handleSaveConfig}
                  />
                )}"""

# Replace the floating assistant wrapper to hide when on activeTab === 'ai-assistant'
old_floating_assistant = """      {/* Global Floating AI Copilot Assistant */}
      <AIAssistant
        currentUser={currentUser}
        students={students}
        diplomas={diplomas}
        sessions={sessions}
        tasks={tasks}
        config={config}
        instructors={instructors}
        diplomaTypes={diplomaTypes}
        onNavigateToSettings={() => {
          setActiveTab('settings');
          window.dispatchEvent(new CustomEvent('TOGGLE_SAYED_AI')); // Close chat after routing
        }}
        onSaveDiplomas={handleSaveDiplomas}
        onSaveStudents={handleSaveStudents}
        onSaveSessions={handleSaveSessions}
        onSaveTasks={handleSaveTasks}
        onSaveConfig={handleSaveConfig}
      />"""

new_floating_assistant = """      {/* Global Floating AI Copilot Assistant */}
      {activeTab !== 'ai-assistant' && (
        <AIAssistant
          mode="floating"
          currentUser={currentUser}
          students={students}
          diplomas={diplomas}
          sessions={sessions}
          tasks={tasks}
          config={config}
          instructors={instructors}
          diplomaTypes={diplomaTypes}
          onNavigateToSettings={() => {
            setActiveTab('settings');
            window.dispatchEvent(new CustomEvent('TOGGLE_SAYED_AI')); // Close chat after routing
          }}
          onSaveDiplomas={handleSaveDiplomas}
          onSaveStudents={handleSaveStudents}
          onSaveSessions={handleSaveSessions}
          onSaveTasks={handleSaveTasks}
          onSaveConfig={handleSaveConfig}
        />
      )}"""

if old_tab_view in app_content:
    app_content = app_content.replace(old_tab_view, new_tab_view)
else:
    app_content = re.sub(
        r'\{\s*activeTab\s*===\s*\'ai-assistant\'\s*&&\s*\(\s*<div className="bg-\[#0B0B0E\].*?</div>\s*\)\s*\}',
        new_tab_view,
        app_content,
        flags=re.DOTALL
    )

app_content = app_content.replace(old_floating_assistant, new_floating_assistant)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(app_content)


# 2. Update AIAssistant.tsx
with open(assistant_path, "r", encoding="utf-8") as f:
    assistant_content = f.read()

# Add mode prop in AIAssistantProps
old_props_interface = """interface AIAssistantProps {
  currentUser: string | null;
  students: Student[];
  diplomas: Diploma[];
  sessions: Session[];
  tasks: Task[];
  config: AppConfig | null;
  instructors: Instructor[];
  diplomaTypes: DiplomaType[];
  onNavigateToSettings: () => void;
  onSaveDiplomas: (data: Diploma[]) => void;
  onSaveStudents: (data: Student[]) => void;
  onSaveSessions: (data: Session[]) => void;
  onSaveTasks: (data: Task[]) => void;
  onSaveConfig: (data: AppConfig) => void;
}"""

new_props_interface = """interface AIAssistantProps {
  currentUser: string | null;
  students: Student[];
  diplomas: Diploma[];
  sessions: Session[];
  tasks: Task[];
  config: AppConfig | null;
  instructors: Instructor[];
  diplomaTypes: DiplomaType[];
  onNavigateToSettings: () => void;
  onSaveDiplomas: (data: Diploma[]) => void;
  onSaveStudents: (data: Student[]) => void;
  onSaveSessions: (data: Session[]) => void;
  onSaveTasks: (data: Task[]) => void;
  onSaveConfig: (data: AppConfig) => void;
  mode?: 'floating' | 'embedded';
}"""

assistant_content = assistant_content.replace(old_props_interface, new_props_interface)

with open(assistant_path, "w", encoding="utf-8") as f:
    f.write(assistant_content)

print("Updates successfully applied to types and code!")
