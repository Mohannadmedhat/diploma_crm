import React, { useState, useEffect } from 'react';
import { Student, Diploma } from '../types';
import { User, Phone, Calendar, FileText, Check, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface StudentFormProps {
  studentToEdit?: Student | null;
  diplomas: Diploma[];
  onSave: (student: Student) => void;
  onCancel: () => void;
}

export default function StudentForm({
  studentToEdit,
  diplomas,
  onSave,
  onCancel
}: StudentFormProps) {
  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDiplomaIds, setSelectedDiplomaIds] = useState<string[]>([]);
  const [joinedDate, setJoinedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // CRM fields
  const [studentType, setStudentType] = useState('New');
  const [coursePrice, setCoursePrice] = useState(0);
  const [payedAmount, setPayedAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [discount, setDiscount] = useState('0%');
  const [deposit, setDeposit] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [salesName, setSalesName] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name);
      setParentName(studentToEdit.parentName);
      setPhone(studentToEdit.phone);
      setEmail(studentToEdit.email || '');
      setSelectedDiplomaIds(studentToEdit.diplomaIds || []);
      setJoinedDate(studentToEdit.joinedDate);
      setNotes(studentToEdit.notes);
      
      setStudentType(studentToEdit.studentType || 'New');
      setCoursePrice(studentToEdit.coursePrice || 0);
      setPayedAmount(studentToEdit.payedAmount || 0);
      setRemainingAmount(studentToEdit.remainingAmount || 0);
      setDiscount(studentToEdit.discount || '0%');
      setDeposit(studentToEdit.deposit || 0);
      setPaymentMethod(studentToEdit.paymentMethod || '');
      setSalesName(studentToEdit.salesName || '');
    } else {
      setName('');
      setParentName('');
      setPhone('+966'); // country code default for Arabic premium demo
      setEmail('');
      setSelectedDiplomaIds(diplomas.length > 0 ? [diplomas[0].id] : []);
      setJoinedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      
      setStudentType('New');
      setCoursePrice(0);
      setPayedAmount(0);
      setRemainingAmount(0);
      setDiscount('0%');
      setDeposit(0);
      setPaymentMethod('');
      setSalesName('');
    }
    setError('');
  }, [studentToEdit, diplomas]);

  const handleToggleDiploma = (id: string) => {
    setSelectedDiplomaIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم الطالب ثلاثي.');
      return;
    }
    if (!parentName.trim()) {
      setError('يرجى إدخال اسم ولي الأمر أو جهة الاتصال الأساسية.');
      return;
    }
    
    // Strip empty spaces, validate phone has digits
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone === '+' || cleanPhone.length < 5) {
      setError('يرجى إدخال رقم هاتف واتساب صحيح يحتوي على رمز الدولة (مثل: +966500000000)');
      return;
    }

    if (selectedDiplomaIds.length === 0) {
      setError('يرجى تحديد دبلوم واحد على الأقل لتسجيل الطالب فيه.');
      return;
    }

    const savedStudent: Student = {
      id: studentToEdit ? studentToEdit.id : `st-${Date.now()}`,
      name: name.trim(),
      parentName: parentName.trim(),
      phone: cleanPhone,
      email: email.trim(),
      diplomaIds: selectedDiplomaIds,
      joinedDate: joinedDate || new Date().toISOString().split('T')[0],
      notes: notes.trim(),
      communicationLogs: studentToEdit ? studentToEdit.communicationLogs : [],
      studentType,
      coursePrice,
      payedAmount,
      remainingAmount,
      discount,
      deposit,
      paymentMethod,
      salesName
    };

    onSave(savedStudent);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="bg-[#171717] border border-[#262626] rounded-xl p-6 shadow-2xl text-right"
      id="student-form-component"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-5 border-b border-[#262626] pb-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-[#3B82F6] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
          {studentToEdit ? 'تعديل بيانات طالب' : 'تسجيل طالب جديد'}
        </h3>
        <button
          onClick={onCancel}
          className="text-zinc-500 hover:text-white bg-[#262626] hover:bg-[#333] p-1.5 rounded transition-colors cursor-pointer"
          type="button"
          aria-label="إغلاق"
          id="btn-close-form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-955/20 border border-red-500/20 text-red-100 text-xs flex items-start gap-2 rounded" id="form-error-banner">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="student-name-input">
            اسم الطالب كاملاً
          </label>
          <div className="relative">
            <User className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              id="student-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: سليمان عبد الله الحربي"
              className="w-full pr-9 pl-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-right"
              required
            />
          </div>
        </div>

        {/* Guardian Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="guardian-name-input">
            جهة الاتصال / اسم ولي الأمر
          </label>
          <div className="relative">
            <User className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              id="guardian-name-input"
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="مثال: أبو سليمان الحربي (لصيغ رسائل WhatsApp)"
              className="w-full pr-9 pl-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-right"
              required
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">يستخدم كمتغير ديناميكي في صياغة نصوص التنبيهات.</span>
        </div>

        {/* Whatsapp contact */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="whatsapp-phone-input">
            رقم هاتف الواتساب (مع رمز الدولة)
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              id="whatsapp-phone-input"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966500000000"
              className="w-full pr-9 pl-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-left font-mono"
              dir="ltr"
              required
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block select-none">يرجى كتابة الرمز كاملاً مع علامة الزائد وبدون مسافات لتسهيل فتح رابط تطبيق الهاتف بنجاح.</span>
        </div>

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="student-email-input">
            البريد الإلكتروني للطالب (اختياري)
          </label>
          <div className="relative">
            <span className="absolute right-3 top-2.5 text-xs text-zinc-500">@</span>
            <input
              id="student-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@academy.com"
              className="w-full pr-9 pl-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-left font-mono"
              dir="ltr"
            />
          </div>
        </div>

        {/* CRM and Financial Fields Divider */}
        <div className="pt-4 pb-2 border-t border-[#262626] mt-4">
          <h4 className="text-xs font-bold text-[#3B82F6] flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
            البيانات المالية وإدارة العملاء (CRM)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Type */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-st-type">
                حالة الطالب (St-Type)
              </label>
              <input
                id="crm-st-type"
                type="text"
                list="student-types-list"
                value={studentType}
                onChange={(e) => setStudentType(e.target.value)}
                placeholder="مثال: New أو Delay 34"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-right"
              />
              <datalist id="student-types-list">
                <option value="New" />
                <option value="Delay 34" />
              </datalist>
            </div>

            {/* Sales Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-sales-name">
                مسؤول المبيعات (Sales-Name)
              </label>
              <input
                id="crm-sales-name"
                type="text"
                value={salesName}
                onChange={(e) => setSalesName(e.target.value)}
                placeholder="مثال: Sara Samy"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-right"
              />
            </div>

            {/* Course Price */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-course-price">
                سعر الكورس (Course Price)
              </label>
              <input
                id="crm-course-price"
                type="number"
                value={coursePrice || ''}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setCoursePrice(val);
                  setRemainingAmount(val - payedAmount);
                }}
                placeholder="0"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 outline-hidden transition-all text-right font-mono"
              />
            </div>

            {/* Payed Amount */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-payed-amount">
                المدفوع (Payed)
              </label>
              <input
                id="crm-payed-amount"
                type="number"
                value={payedAmount || ''}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setPayedAmount(val);
                  setRemainingAmount(coursePrice - val);
                }}
                placeholder="0"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 outline-hidden transition-all text-right font-mono"
              />
            </div>

            {/* Remaining Amount */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-remaining-amount">
                المتبقي (Remaining Amount)
              </label>
              <input
                id="crm-remaining-amount"
                type="number"
                value={remainingAmount || ''}
                onChange={(e) => setRemainingAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 outline-hidden transition-all text-right font-mono"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-discount">
                الخصم (Discount)
              </label>
              <input
                id="crm-discount"
                type="text"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0% أو 10%"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-right"
              />
            </div>

            {/* Deposit */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-deposit">
                العربون (Deposit)
              </label>
              <input
                id="crm-deposit"
                type="number"
                value={deposit || ''}
                onChange={(e) => setDeposit(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 outline-hidden transition-all text-right font-mono"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="crm-payment-method">
                طريقة الدفع (Payment Method)
              </label>
              <input
                id="crm-payment-method"
                type="text"
                list="payment-methods-list"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="مثال: Instapay أو VF"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden transition-all text-right"
              />
              <datalist id="payment-methods-list">
                <option value="Instapay" />
                <option value="VF" />
                <option value="Cash" />
              </datalist>
            </div>
          </div>
        </div>

        {/* Diploma Multiselect Checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2">
            تمكين وتنسيب الدبلومات (اختر واحداً أو أكثر)
          </label>
          <div className="bg-[#0A0A0A] border border-[#262626] rounded p-3 space-y-2 max-h-40 overflow-y-auto">
            {diplomas.map((dip) => {
              const checked = selectedDiplomaIds.includes(dip.id);
              return (
                <label
                  key={dip.id}
                  className="flex items-center gap-2.5 text-xs text-zinc-300 hover:text-white cursor-pointer select-none py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleDiploma(dip.id)}
                    className="w-4 h-4 bg-[#171717] border border-[#262626] rounded text-[#3B82F6] focus:ring-0 cursor-pointer"
                  />
                  <span>{dip.name}</span>
                </label>
              );
            })}
            {diplomas.length === 0 && (
              <p className="text-zinc-500 text-xs text-center py-2">لا يوجد دبلومات مسجلة حالياً. يرجى إضافة دبلوم أولاً.</p>
            )}
          </div>
        </div>

        {/* Enrollment Date */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="joined-date-input">
            تاريخ الانضمام والتسجيل
          </label>
          <div className="relative">
            <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              id="joined-date-input"
              type="date"
              value={joinedDate}
              onChange={(e) => setJoinedDate(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 outline-hidden cursor-pointer text-right"
            />
          </div>
        </div>

        {/* Operations Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="student-notes-input">
            ملاحظات الشؤون التعليمية والعمليات
          </label>
          <div className="relative">
            <FileText className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500 animate-pulse" />
            <textarea
              id="student-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي معلومات هامة هنا (مثل: خلفيته العلمية، مواعيد تفرغه، ملاحظات خاصة...)"
              rows={3}
              className="w-full pr-9 pl-4 py-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#333] focus:border-[#3B82F6] rounded text-xs text-zinc-100 placeholder-zinc-700 outline-hidden resize-none text-right placeholder:text-zinc-700"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-start gap-3 pt-4 border-t border-[#262626]">
          <button
            type="submit"
            className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            id="btn-submit-student-form"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{studentToEdit ? 'حفظ التعديلات' : 'إتمام التسجيل الأكاديمي'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#262626] text-zinc-300 hover:bg-[#333] hover:text-white rounded text-xs font-semibold cursor-pointer transition-colors"
            id="btn-cancel-student-form"
          >
            إلغاء الأمر
          </button>
        </div>
      </form>
    </motion.div>
  );
}
