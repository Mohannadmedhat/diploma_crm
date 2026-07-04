import React, { useState, useMemo, useRef } from 'react';
import { Student, Diploma } from '../types';
import { bulkParseStudentCSV, generateArabicCSV } from '../services/business';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  UserCheck,
  Briefcase,
  HelpCircle,
  FileCheck2,
  X,
  PlusCircle,
  Info
} from 'lucide-react';
import StudentForm from './StudentForm';
import { motion, AnimatePresence } from 'motion/react';

interface StudentEnrollmentProps {
  students: Student[];
  diplomas: Diploma[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (id: string, name: string) => void;
  onBulkImport: (importedStudents: Student[]) => void;
}

export default function StudentEnrollment({
  students,
  diplomas,
  onSaveStudent,
  onDeleteStudent,
  onBulkImport
}: StudentEnrollmentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [diplomaFilter, setDiplomaFilter] = useState('All');
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  
  // Bulk import console
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importNotice, setImportNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter computations
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q));

      const matchesDiploma = diplomaFilter === 'All' || s.diplomaIds.includes(diplomaFilter);

      return matchesSearch && matchesDiploma;
    });
  }, [students, searchQuery, diplomaFilter]);

  // Handle Export Excel/CSV
  const handleExportCSV = () => {
    const headers = [
      'Name',
      'Phone',
      'St-Type',
      'Course Price',
      'Remaining Amount',
      'Payed',
      'Discount',
      'Deposit',
      'Payment method',
      'Date of Registration',
      'Sales-Name'
    ];

    const rows = filteredStudents.map((s) => {
      return [
        s.name,
        s.phone,
        s.studentType || 'New',
        String(s.coursePrice || 0),
        String(s.remainingAmount || 0),
        String(s.payedAmount || 0),
        s.discount || '0%',
        String(s.deposit || 0),
        s.paymentMethod || '',
        s.joinedDate || '',
        s.salesName || ''
      ];
    });

    const csvBlob = generateArabicCSV(headers, rows);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    link.download = `سجل_الطلاب_المسجلين_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Process paste parse
  const handlePasteImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportNotice('');

    if (!pasteContent.trim()) {
      setImportNotice('يرجى لصق بيانات CSV صالحة.');
      return;
    }

    try {
      const parsed = bulkParseStudentCSV(pasteContent, diplomas);
      if (parsed.length === 0) {
        setImportNotice('فشل استيراد أي طالب. يرجى مراجعة الصياغة والتأكد من تطابق الأعمدة.');
        return;
      }

      onBulkImport(parsed);
      setPasteContent('');
      setShowImportDrawer(false);
      alert(`نجح استيراد وتثبيت ${parsed.length} طالب جديد في قاعدة البيانات!`);
    } catch {
      setImportNotice('حدث خطأ فني أثناء تحليل البيانات.');
    }
  };

  // Process File CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportNotice('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const parsed = bulkParseStudentCSV(text, diplomas);
          if (parsed.length === 0) {
            setImportNotice('لم نتمكن من العثور على سجلات مطابقة في الملف المرفوع.');
            return;
          }
          onBulkImport(parsed);
          setShowImportDrawer(false);
          alert(`نجح استيراد ${parsed.length} طالب من الملف المرفوع!`);
        } catch {
          setImportNotice('خطأ في تنسيق ملف CSV المرفوع.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 text-right" id="student-enrollment-module" dir="rtl">
      {/* Header section with active action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3B82F6]" />
            شؤون وقبول الطلاب والتحقق من التنسيب
          </h3>
          <p className="text-xs text-zinc-400">إدارة سجلات المقبولين وتصدير لوائح المشاركين وإلحاقهم بمسارات الفصول المتعددة فورياً</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Student */}
          <button
            onClick={() => {
              setStudentToEdit(null);
              setShowForm(true);
            }}
            className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة طالب جديد
          </button>

          {/* Import Panel trigger */}
          <button
            onClick={() => {
              setShowImportDrawer(!showImportDrawer);
              setImportNotice('');
            }}
            className="px-3 py-1.5 bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-200 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            استيراد جماعي (CSV)
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-[#065F46] hover:bg-emerald-600 text-emerald-100 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير اللائحة (Excel)
          </button>
        </div>
      </div>

      {/* Slide form container */}
      <AnimatePresence>
        {showForm && (
          <div className="bg-[#0A0A0A] p-4 rounded-xl border border-zinc-800">
            <StudentForm
              studentToEdit={studentToEdit}
              diplomas={diplomas}
              onSave={(st) => {
                onSaveStudent(st);
                setShowForm(false);
                setStudentToEdit(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setStudentToEdit(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* CSV Bulk Import Dialog/Drawer */}
      <AnimatePresence>
        {showImportDrawer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-[#0F0F0F] border border-[#3B82F6]/30 rounded-xl p-5 space-y-4 text-right"
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <span className="text-xs font-bold text-[#3B82F6] flex items-center gap-1">
                <FileCheck2 className="w-4 h-4 text-[#3B82F6]" />
                استيراد وتغذية سجلات الطلاب دفعة واحدة (CSV)
              </span>
              <button onClick={() => setShowImportDrawer(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {importNotice && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-100 text-[11px] rounded">
                {importNotice}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Option A: Upload File */}
              <div className="bg-[#0A0A0A]/50 border border-dashed border-[#262626] rounded-xl p-4 flex flex-col justify-between items-center text-center space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-zinc-150 block text-right">الطريقة الأولى: رفع ملف CSV جاهز</span>
                  <span className="text-[10px] text-zinc-500 block text-right font-sans">تأكد أن السطر الأول يحتوي على العناوين الآتية:</span>
                  <code className="text-[9px] font-mono text-zinc-400 bg-zinc-900 p-1 block leading-normal rounded select-all font-sans">
                    Name, Phone, St-Type, Course Price, Remaining Amount, Payed, Discount, Deposit, Payment method, Date of Registration, Sales-Name
                  </code>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-200 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  اختر ملف CSV من جهازك
                </button>
              </div>

              {/* Option B: Copy Paste */}
              <form onSubmit={handlePasteImportSubmit} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 block">الطريقة الثانية: لصق نصوص جدولية مباشرة</label>
                  <span className="text-[9px] text-zinc-500 font-sans">فصل بين القيم بمرمز الفاصلة ,</span>
                </div>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={`Name, Phone, St-Type, Course Price, Remaining Amount, Payed, Discount, Deposit, Payment method, Date of Registration, Sales-Name\nمحمد عمرو, 1027433010, New, 5500, 0, 5500, 0%, 1000, Instapay, 11/1/2026, Sara Samy`}
                  rows={4}
                  className="w-full p-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs font-sans text-zinc-200 outline-hidden tracking-normal text-right placeholder-zinc-800 rounded resize-none"
                />
                <div className="flex justify-end select-none">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-[11px] font-semibold cursor-pointer transition-all active:scale-95"
                  >
                    حلل واقذف البيانات فورا
                  </button>
                </div>
              </form>
            </div>
            
            <div className="bg-[#171717] p-2.5 rounded border border-[#262626] text-[10px] text-zinc-400 flex items-start gap-1.5 font-sans leading-relaxed">
              <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
              <span>
                <strong>ملاحظة هامة:</strong> سيتم التعرف على الدبلوم وتنسيبه تلقائياً عبر مضاهاة الكلمات الدليلة لاسم الدبلوم المسجل في النظام. في حال عدم وجود مطابقة، سيتم ترحيل الطلاب للدبلوم النشط الافتراضي لضمان التثبيت.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Row search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#111111] p-3 rounded-lg border border-[#262626]">
        {/* Local Quick Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="ابحث بالاسم، هاتف الواتساب للأب، مذكرات الملاحظات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-1.5 bg-[#0F0F0F] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs placeholder-zinc-700 text-[#E5E5E5] focus:outline-hidden text-right placeholder:text-zinc-700"
            id="directory-search-field-enrollment"
          />
        </div>

        {/* Filter by course selection */}
        <div className="flex items-center gap-1 font-sans">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase pr-1 select-none">الدبلوم التدريبي:</span>
          <select
            value={diplomaFilter}
            onChange={(e) => setDiplomaFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0F0F0F] text-xs text-zinc-350 border border-[#262626] rounded outline-hidden cursor-pointer text-right"
            id="course-track-filter-select-enrollment"
          >
            <option value="All">كل الدبلومات النشطة</option>
            {diplomas.map((dip) => (
              <option key={dip.id} value={dip.id}>
                {dip.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory items feeding */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1" id="student-directory-enrollment-items">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-[#0F0F0F] border border-[#262626] border-dashed rounded font-sans">
            <span className="text-zinc-500 text-xs text-center block leading-relaxed">
              لا توجد سجلات طلاب تطابق معايير البحث والفرز في قاعدة البيانات حالياً.
            </span>
          </div>
        ) : (
          filteredStudents.map((st) => (
            <div
              key={st.id}
              className="p-4 bg-[#0F0F0F] border border-[#262626] rounded-lg hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-100 font-bold text-xs">{st.name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {st.diplomaIds.map((dipId) => {
                      const foundDip = diplomas.find((d) => d.id === dipId);
                      return foundDip ? (
                        <span
                          key={dipId}
                          className="text-[9px] bg-[#1a2d42] border border-blue-900/30 text-blue-300 font-sans px-2 py-0.5 rounded-full"
                        >
                          {foundDip.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-zinc-400 text-xs font-sans">
                  <span className="font-mono" dir="ltr">
                    <strong className="text-zinc-500 text-[10px] font-sans">الواتساب:</strong> {st.phone}
                  </span>
                  <span>
                    <strong className="text-zinc-500 text-[10px]">تاريخ الانضمام:</strong> {st.joinedDate}
                  </span>
                </div>

                {/* CRM Financial Metadata Block */}
                <div className="mt-2.5 pt-2 border-t border-[#1a1a1a] grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px] font-sans text-zinc-400">
                  {st.studentType && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">حالة الطالب: </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1f2937] text-zinc-200 text-[9px] font-semibold font-sans">{st.studentType}</span>
                    </div>
                  )}
                  {st.salesName && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">المبيعات: </span>
                      <span className="text-zinc-200">{st.salesName}</span>
                    </div>
                  )}
                  {st.paymentMethod && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">طريقة الدفع: </span>
                      <span className="text-zinc-200">{st.paymentMethod}</span>
                    </div>
                  )}
                  {st.discount && st.discount !== '0%' && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">الخصم: </span>
                      <span className="text-emerald-400 font-semibold">{st.discount}</span>
                    </div>
                  )}
                  {st.coursePrice !== undefined && st.coursePrice > 0 && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">السعر: </span>
                      <span className="text-zinc-300 font-mono">{st.coursePrice} EGP</span>
                    </div>
                  )}
                  {st.payedAmount !== undefined && st.payedAmount > 0 && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">المدفوع: </span>
                      <span className="text-emerald-500 font-semibold font-mono">{st.payedAmount} EGP</span>
                    </div>
                  )}
                  {st.remainingAmount !== undefined && st.remainingAmount > 0 && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">المتبقي: </span>
                      <span className="text-amber-500 font-semibold font-mono">{st.remainingAmount} EGP</span>
                    </div>
                  )}
                  {st.deposit !== undefined && st.deposit > 0 && (
                    <div>
                      <span className="text-zinc-500 text-[10px]">العربون: </span>
                      <span className="text-[#3B82F6] font-mono">{st.deposit} EGP</span>
                    </div>
                  )}
                </div>

                {st.notes && (
                  <p className="text-zinc-500 text-xs mt-2 italic border-r-2 border-[#262626] pr-2.5 font-sans">
                    " {st.notes} "
                  </p>
                )}
              </div>

              {/* Action outputs */}
              <div className="flex items-center gap-1 shrink-0 bg-[#0A0A0A] border border-[#262626] p-1 rounded select-none self-end md:self-start">
                <button
                  onClick={() => {
                    setStudentToEdit(st);
                    setShowForm(true);
                  }}
                  className="p-1 px-2.5 bg-[#171717] rounded border border-[#262626] text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-0.5 font-sans"
                  title="تعديل"
                >
                  <Edit2 className="w-3 h-3 text-[#3B82F6]" />
                  تعديل
                </button>
                <button
                  onClick={() => onDeleteStudent(st.id, st.name)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-[#1a0f0f] rounded transition-colors cursor-pointer"
                  title="حدف الأرشيف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
