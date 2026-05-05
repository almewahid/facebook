'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Calendar, Plus, Trash2, Zap, Moon, CheckCircle2, AlertCircle } from 'lucide-react';

const DAYS_AR = [
  { key: 'sat', label: 'السبت' },
  { key: 'sun', label: 'الأحد' },
  { key: 'mon', label: 'الاثنين' },
  { key: 'tue', label: 'الثلاثاء' },
  { key: 'wed', label: 'الأربعاء' },
  { key: 'thu', label: 'الخميس' },
  { key: 'fri', label: 'الجمعة' },
];

const STORAGE_KEY = 'smart_schedule_config';

function loadSchedule() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { }
  return {
    enabled: false,
    times: ['09:00', '15:00', '21:00'],
    restDays: ['fri'],
    intervalMin: 3,
    intervalMax: 8,
  };
}

function saveSchedule(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { }
}

export default function SmartScheduleDialog({ open, onClose, onStartBot }) {
  const [config, setConfig] = useState(loadSchedule);
  const [saved, setSaved] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setConfig(loadSchedule());
      setSaved(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const toggleRestDay = (day) => {
    setConfig(prev => ({
      ...prev,
      restDays: prev.restDays.includes(day)
        ? prev.restDays.filter(d => d !== day)
        : [...prev.restDays, day],
    }));
  };

  const addTime = () => {
    if (!newTime) return;
    if (config.times.includes(newTime)) {
      setError('هذا الوقت مضاف مسبقاً');
      return;
    }
    if (config.times.length >= 10) {
      setError('الحد الأقصى 10 أوقات');
      return;
    }
    setError('');
    setConfig(prev => ({
      ...prev,
      times: [...prev.times, newTime].sort(),
    }));
    setNewTime('');
  };

  const removeTime = (t) => {
    if (config.times.length <= 1) {
      setError('يجب إبقاء وقت واحد على الأقل');
      return;
    }
    setError('');
    setConfig(prev => ({ ...prev, times: prev.times.filter(x => x !== t) }));
  };

  const handleSave = () => {
    if (config.times.length === 0) {
      setError('أضف وقتاً واحداً على الأقل');
      return;
    }
    saveSchedule(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleActivate = () => {
    if (config.times.length === 0) {
      setError('أضف وقتاً واحداً على الأقل');
      return;
    }
    const updated = { ...config, enabled: true };
    saveSchedule(updated);
    setConfig(updated);
    // Pass schedule config to bot start
    if (onStartBot) onStartBot(updated);
    onClose();
  };

  const activeDays = DAYS_AR.filter(d => !config.restDays.includes(d.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">الجدولة الذكية</h2>
              <p className="text-blue-100 text-xs">نشر تلقائي على مدار اليوم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="font-semibold text-gray-800 text-sm">تفعيل الجدولة التلقائية</p>
              <p className="text-gray-500 text-xs mt-0.5">ينشر البوت حسب الأوقات المحددة</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${config.enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${config.enabled ? 'right-1' : 'left-1'
                }`} />
            </button>
          </div>

          {/* Publishing Times */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-800 text-sm">أوقات النشر اليومية</h3>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {config.times.map(t => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-1.5 text-sm font-mono"
                >
                  {t}
                  <button
                    onClick={() => removeTime(t)}
                    className="text-blue-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
              <button
                onClick={addTime}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>
          </div>

          {/* Interval between groups - random range */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-gray-800 text-sm">الفاصل العشوائي بين المجموعات</h3>
              <span className="text-xs text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">يحاكي السلوك الطبيعي</span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-4">
              {/* Visual range display */}
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 font-bold text-indigo-700 min-w-[56px] text-center">
                  {config.intervalMin} د
                </span>
                <div className="flex-1 flex items-center gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? 'bg-indigo-300' : i < 6 ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
                  ))}
                </div>
                <span className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 font-bold text-indigo-700 min-w-[56px] text-center">
                  {config.intervalMax} د
                </span>
              </div>

              <p className="text-center text-xs text-indigo-600">
                كل فاصل سيكون عشوائياً بين <strong>{config.intervalMin}</strong> و<strong>{config.intervalMax}</strong> دقيقة
              </p>

              {/* Min slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>الحد الأدنى</span>
                  <span>{config.intervalMin} دقيقة</span>
                </div>
                <input
                  type="range" min={1} max={59}
                  value={config.intervalMin}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setConfig(prev => ({
                      ...prev,
                      intervalMin: val,
                      intervalMax: Math.max(prev.intervalMax, val + 1),
                    }));
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Max slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>الحد الأقصى</span>
                  <span>{config.intervalMax} دقيقة</span>
                </div>
                <input
                  type="range" min={2} max={60}
                  value={config.intervalMax}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setConfig(prev => ({
                      ...prev,
                      intervalMax: val,
                      intervalMin: Math.min(prev.intervalMin, val - 1),
                    }));
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Rest Days */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-800 text-sm">أيام الراحة (لا ينشر فيها)</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_AR.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleRestDay(d.key)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all border ${config.restDays.includes(d.key)
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                    }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-2">📋 ملخص الجدول</p>
            <p className="text-xs text-gray-600">
              ينشر <span className="font-bold text-blue-700">{config.times.length} مرة</span> يومياً
              {activeDays.length > 0 && (
                <> في <span className="font-bold text-blue-700">{activeDays.map(d => d.label).join('، ')}</span></>
              )}
              {config.restDays.length > 0 && (
                <> — يستريح {config.restDays.length === 7 ? 'كل الأسبوع ⚠️' : DAYS_AR.filter(d => config.restDays.includes(d.key)).map(d => d.label).join('، ')}</>
              )}
              {config.intervalMin > 0 && (
                <> — فاصل عشوائي <span className="font-bold text-blue-700">{config.intervalMin}–{config.intervalMax} دقيقة</span> بين كل مجموعة</>
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 rounded-xl py-2.5 text-sm font-medium transition-all"
          >
            {saved
              ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> تم الحفظ!</>
              : 'حفظ الإعدادات'
            }
          </button>
          <button
            onClick={handleActivate}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-all shadow-md shadow-blue-200"
          >
            <Zap className="w-4 h-4" />
            تفعيل وبدء البوت
          </button>
        </div>
      </div>
    </div>
  );
}