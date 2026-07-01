import os

mentors_path = r"e:\diploma-operations-assistant (3)\src\components\MentorsManager.tsx"
with open(mentors_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { Mentor, Diploma } from '../types';", "import { Mentor, Diploma, Session } from '../types';")

# 2. Update interface MentorsProps
old_props = """interface MentorsProps {
  mentors: Mentor[];
  onSaveMentors: (mentors: Mentor[]) => void;
  isAdmin?: boolean;
  diplomas: Diploma[];
}"""

new_props = """interface MentorsProps {
  mentors: Mentor[];
  onSaveMentors: (mentors: Mentor[]) => void;
  isAdmin?: boolean;
  diplomas: Diploma[];
  sessions: Session[];
}"""
content = content.replace(old_props, new_props)

# 3. Add states for hourlyRate and rating in MentorsManager
old_states = """  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');"""

new_states = """  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [rating, setRating] = useState<number>(5);
  const [error, setError] = useState('');"""

content = content.replace(old_states, new_states)

# 4. Update handleStartAdd
old_add = """  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setSpecialty('');
    setStatus('Active');
    setShowForm(true);
    setError('');
  };"""

new_add = """  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setSpecialty('');
    setStatus('Active');
    setHourlyRate('');
    setRating(5);
    setShowForm(true);
    setError('');
  };"""

content = content.replace(old_add, new_add)

# 5. Update handleStartEdit
old_edit = """  const handleStartEdit = (ment: Mentor) => {
    setEditingId(ment.id);
    setName(ment.name);
    setPhone(ment.phone);
    setEmail(ment.email);
    setSpecialty(ment.specialty || '');
    setStatus(ment.status);
    setShowForm(true);
    setError('');
  };"""

new_edit = """  const handleStartEdit = (ment: Mentor) => {
    setEditingId(ment.id);
    setName(ment.name);
    setPhone(ment.phone);
    setEmail(ment.email);
    setSpecialty(ment.specialty || '');
    setStatus(ment.status);
    setHourlyRate(ment.hourlyRate !== undefined ? ment.hourlyRate : '');
    setRating(ment.rating !== undefined ? ment.rating : 5);
    setShowForm(true);
    setError('');
  };"""

content = content.replace(old_edit, new_edit)

# 6. Update handleSave
old_save = """    const savedMent: Mentor = {
      id: editingId || `ment-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      specialty: specialty.trim() || undefined,
      status: status
    };"""

new_save = """    const savedMent: Mentor = {
      id: editingId || `ment-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      specialty: specialty.trim() || undefined,
      status: status,
      hourlyRate: hourlyRate !== '' ? Number(hourlyRate) : undefined,
      rating: Number(rating)
    };"""

content = content.replace(old_save, new_save)

# 7. Add form fields inside the form JSX. Let's find:
# "            <div>\n              <label className=\"block text-[10px] font-bold text-zinc-400 mb-1.5\">\n                حالة المنتور المهنية الحالية"
# and insert our fields before it.

old_status_field = """            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                حالة المنتور المهنية الحالية
              </label>"""

new_status_field = """            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  سعر ساعة الإشراف/التدريب المقدرة (EGP)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="مثال: 150"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right font-sans font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  تقييم الأداء الحالي (من 1 إلى 5)
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-300 rounded-lg outline-hidden cursor-pointer"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (ممتاز - 5)</option>
                  <option value="4">⭐⭐⭐⭐ (جيد جداً - 4)</option>
                  <option value="3">⭐⭐⭐ (جيد - 3)</option>
                  <option value="2">⭐⭐ (مقبول - 2)</option>
                  <option value="1">⭐ (ضعيف - 1)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                حالة المنتور المهنية الحالية
              </label>"""

content = content.replace(old_status_field, new_status_field)

# 8. Update card calculations and render details in MentorsManager
# Let's find:
# "          const mentorDips = diplomas.filter(d => d.mentorId === ment.id);
#           const activeDips = mentorDips.filter(d => d.status === 'Active');"
# and insert:
# "          const mentorDipIds = mentorDips.map(d => d.id);\n          const mentorSessions = sessions.filter(s => mentorDipIds.includes(s.diplomaId));\n          const totalHours = mentorSessions.reduce((sum, s) => {\n            if (!s.startTime || !s.endTime) return sum + 2;\n            try {\n              const [sh, sm] = s.startTime.split(':').map(Number);\n              const [eh, em] = s.endTime.split(':').map(Number);\n              const diffMin = (eh * 60 + em) - (sh * 60 + sm);\n              return sum + (diffMin > 0 ? diffMin / 60 : 2);\n            } catch (e) {\n              return sum + 2;\n            }\n          }, 0);\n          const totalEarnings = totalHours * (ment.hourlyRate || 0);"

old_card_dips = """          const mentorDips = diplomas.filter(d => d.mentorId === ment.id);
          const activeDips = mentorDips.filter(d => d.status === 'Active');"""

new_card_dips = """          const mentorDips = diplomas.filter(d => d.mentorId === ment.id);
          const activeDips = mentorDips.filter(d => d.status === 'Active');

          const mentorDipIds = mentorDips.map(d => d.id);
          const mentorSessions = sessions.filter(s => mentorDipIds.includes(s.diplomaId));
          const totalHours = mentorSessions.reduce((sum, s) => {
            if (!s.startTime || !s.endTime) return sum + 2;
            try {
              const [sh, sm] = s.startTime.split(':').map(Number);
              const [eh, em] = s.endTime.split(':').map(Number);
              const diffMin = (eh * 60 + em) - (sh * 60 + sm);
              return sum + (diffMin > 0 ? diffMin / 60 : 2);
            } catch (e) {
              return sum + 2;
            }
          }, 0);
          const totalEarnings = totalHours * (ment.hourlyRate || 0);"""

content = content.replace(old_card_dips, new_card_dips)

# 9. Insert the dashboard JSX in the card. Let's find:
# "                  {/* Active Diplomas Count */}"
# block and insert our custom details right under the specialty and Active Diplomas Count block.
# Actually let's find the closing tag of the specialty/activeDips details block:
# "                  </div>\n                </div>\n              </div>"

old_dips_count_block = """                  {/* Active Diplomas Count */}
                  <div className="flex items-center gap-1 text-[9px] text-teal-400 font-sans font-medium mt-1">
                    <BookOpen className="w-2.5 h-2.5 shrink-0" />
                    <span>
                      {activeDips.length > 0 
                        ? `مسؤول عن: ${activeDips.length} دبلومة نشطة`
                        : 'لا توجد دبلومات نشطة حالياً'
                      }
                    </span>
                  </div>
                </div>
              </div>"""

new_dips_count_block = """                  {/* Active Diplomas Count */}
                  <div className="flex items-center gap-1 text-[9px] text-teal-400 font-sans font-medium mt-1">
                    <BookOpen className="w-2.5 h-2.5 shrink-0" />
                    <span>
                      {activeDips.length > 0 
                        ? `مسؤول عن: ${activeDips.length} دبلومة نشطة`
                        : 'لا توجد دبلومات نشطة حالياً'
                      }
                    </span>
                  </div>

                  {/* Financial & Performance Stats */}
                  <div className="mt-3.5 pt-2.5 border-t border-zinc-900 grid grid-cols-2 gap-2 text-[10px] font-sans">
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">سعر الساعة:</span>
                      <span className="text-zinc-200 font-bold font-mono">
                        {ment.hourlyRate !== undefined ? `${ment.hourlyRate} EGP` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">مستحقات المنتور:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {totalEarnings > 0 ? `${totalEarnings.toLocaleString()} EGP` : '0 EGP'}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">إجمالي الساعات:</span>
                      <span className="text-zinc-200 font-bold font-mono">{totalHours.toFixed(1)} ساعة</span>
                    </div>
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">المحاضرات المنجزة:</span>
                      <span className="text-teal-400 font-bold font-mono">{mentorSessions.length} محاضرة</span>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] bg-zinc-950/30 border border-zinc-900 p-1.5 px-2.5 rounded-lg">
                    <span className="text-zinc-500 font-bold">تقييم أداء المنتور:</span>
                    <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
                      <span>{ment.rating || 5}</span>
                      <span className="text-xs">★</span>
                    </div>
                  </div>
                </div>
              </div>"""

content = content.replace(old_dips_count_block, new_dips_count_block)

# 10. Destructure sessions from props
content = content.replace("export default function MentorsManager({ mentors, onSaveMentors, isAdmin = false, diplomas }: MentorsProps) {",
                          "export default function MentorsManager({ mentors, onSaveMentors, isAdmin = false, diplomas, sessions }: MentorsProps) {")

with open(mentors_path, "w", encoding="utf-8") as f:
    f.write(content)

print("MentorsManager.tsx successfully updated!")
