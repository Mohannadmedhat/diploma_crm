import React, { useRef, useState } from 'react';
import { generateBackupJSON, restoreBackupJSON } from '../services/storage';
import { Download, Upload, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataBackupRestoreProps {
  onSuccessRestore: () => void;
}

export default function DataBackupRestore({ onSuccessRestore }: DataBackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBackup = () => {
    setError('');
    setSuccess('');
    try {
      const backupString = generateBackupJSON();
      const blob = new Blob([backupString], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `نسخة_احتياطية_منصة_الدبلومات_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setSuccess('تم تصدير وحفظ النسخة الاحتياطية بنجاح تام على جهازك!');
    } catch {
      setError('وقع خلل فني أثناء حزم وتصدير البيانات.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccess('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setError('تعذر قراءة محتوى الملف المرفق.');
        return;
      }

      if (window.confirm('🚨 تحذير هام:\nاستعادة نسخة احتياطية ستقوم باستبدال كافة البيانات الحالية بالكامل وتجديد النظام.\nهل أنت متأكد من رغبتك في المتابعة؟')) {
        const result = restoreBackupJSON(text);
        if (result) {
          setSuccess('تمت استعادة وتحديث قاعدة البيانات بنجاح خارق! جاري إعادة تهيئة اللوحة...');
          setTimeout(() => {
            onSuccessRestore();
          }, 1500);
        } else {
          setError('الملف المرفق غير صالح أو لا يحتوي على كتل بنيوية أساسية متوافقة.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#111111]/80 border border-[#222] rounded-xl p-5 text-right space-y-4 font-sans select-none" id="data-backup-restore" dir="rtl">
      <div>
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
          سرية البيانات والنسخ الاحتياطي التكاملي
        </h4>
        <p className="text-[11px] text-zinc-400 mt-1">تصدير قاعدة البيانات بالكامل أو استردادها في أي وقت لحمايتها من الفقدان والانهيار</p>
      </div>

      {error && (
        <div className="p-3 bg-red-955/20 border border-red-500/20 text-red-200 text-xs rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-250 text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Export Column */}
        <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#232323] flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-zinc-200 block">نسخ ومغادرة البيانات (تصدير)</span>
            <span className="text-[10px] text-zinc-500 block leading-relaxed">توليد ملف JSON يحتوي على سجلات الطلاب المقبولين، قوائم الغياب والتحضير الصفي، التنويهات، والتكاليف لتخزينه بأمان خارج المتصفح.</span>
          </div>
          <button
            onClick={handleBackup}
            className="w-full py-2 bg-[#1C1917] hover:bg-[#2E2A27] text-zinc-200 border border-[#444] rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            توليد وتحميل النسخة الاحتياطية الحالية
          </button>
        </div>

        {/* Import Column */}
        <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#232323] flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-zinc-200 block">رفع واستعادة نسخة سابقة (استيراد)</span>
            <span className="text-[10px] text-zinc-500 block leading-relaxed">استبدال البيانات الحالية عبر رفع ملف النسخة الاحتياطية بتنسيق (.json). سيتم فورياً تجديد الواجهة وبنيوية الأرشيف.</span>
          </div>
          <div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              className="w-full py-2 bg-[#1E3A8A]/20 hover:bg-[#1E3A8A]/40 text-[#60A5FA] border border-[#2563EB]/45 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5 text-[#60A5FA]" />
              رفع ملف النسخة الاحتياطية لتنصيبه
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
