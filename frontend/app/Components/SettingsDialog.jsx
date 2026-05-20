'use client';

import { authFetch } from '../utils/authFetch';
import { useState, useEffect } from 'react';
import { X, Save, LogOut, LogIn, Globe, User, CheckCircle, AlertCircle, Monitor, RefreshCw, Copy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const IS_REMOTE_API = /^https?:\/\//i.test(API_URL) && !/localhost|127\.0\.0\.1/i.test(API_URL);
const TOKEN_STORAGE_KEY = 'fb_poster_access_token';

/**
 * مكون زر فتح المتصفح
 * تم تحسينه لمنع الـ Double-Click وإظهار حالة الاتصال بدقة
 */
function LoginBrowserButton({ onSuccess }) {
  const [status, setStatus] = useState('idle'); // idle | opening | open | closing

  const handleOpen = async () => {
    if (IS_REMOTE_API) {
      alert('فتح Chrome اليدوي متاح فقط عند تشغيل الباكند محلياً على جهازك. النسخة الحالية متصلة بسيرفر Render، ولا يمكنه فتح نافذة على جهازك.');
      return;
    }
    if (status !== 'idle') return;
    setStatus('opening');
    try {
      const res = await authFetch(`${API_URL}/bot/open-login-browser`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('open');
      } else {
        setStatus('idle');
        alert('⚠️ خطأ من السيرفر: ' + (data.detail || data.message || 'فشل فتح المتصفح'));
      }
    } catch (err) {
      setStatus('idle');
      alert('❌ فشل الاتصال بالسيرفر. تأكد من تشغيل الباك-إند على منفذ 8000');
    }
  };

  const handleClose = async () => {
    setStatus('closing');
    try {
      const res = await authFetch(`${API_URL}/bot/close-login-browser`, { method: 'POST' });
      setStatus('idle');
      if (res.ok) {
        onSuccess?.();
      }
    } catch (err) {
      setStatus('idle');
      console.error('فشل إغلاق المتصفح برمجياً');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {IS_REMOTE_API && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">
          فتح Chrome وتسجيل دخول فيسبوك اليدوي يعمل من التشغيل المحلي فقط. النسخة المنشورة تحفظ الإعدادات وتشغل الخدمات، لكنها لا تستطيع فتح نافذة Chrome على جهازك.
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleOpen}
          disabled={IS_REMOTE_API || status !== 'idle'}
          className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 ${
            status === 'open'
              ? 'bg-green-50 text-green-700 border border-green-300'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }`}
        >
          {status === 'opening' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {IS_REMOTE_API ? 'فتح Chrome متاح محلياً فقط' :
           status === 'opening' ? 'جاري تشغيل Chrome...' :
           status === 'open'    ? '✅ المتصفح نشط الآن' :
                                 '🌐 فتح المتصفح لتسجيل الدخول'}
        </button>

        {status === 'open' && (
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-md animate-pulse"
          >
            <Save className="w-4 h-4" /> حفظ الجلسة
          </button>
        )}
      </div>
      {status === 'open' && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 mt-1">
  💡 سجل دخولك في نافذة Chrome التي فتحت، ثم اضغط على زر &quot;حفظ الجلسة&quot; هنا.
</p>
      )}
    </div>
  );
}

export default function SettingsDialog({ show, onClose }) {
  const [pageUrl, setPageUrl] = useState('');
  const [profileExists, setProfileExists] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [chromeProfiles, setChromeProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [safetySettings, setSafetySettings] = useState({
    SAFETY_MIN_DELAY_MINUTES: '1',
    SAFETY_DAILY_POST_LIMIT: '10',
    SAFETY_REST_AFTER_MIN_POSTS: '8',
    SAFETY_REST_AFTER_MAX_POSTS: '12',
    SAFETY_REST_MIN_MINUTES: '1',
    SAFETY_REST_MAX_MINUTES: '3',
  });
  const [savingSafety, setSavingSafety] = useState(false);
  const [agentTokenCopied, setAgentTokenCopied] = useState(false);

  // تحميل البيانات عند فتح النافذة
  useEffect(() => {
    if (show) {
      loadSettings();
      loadChromeProfiles();
    }
  }, [show]);

  // إخفاء الرسائل التلقائية بعد 3 ثوانٍ
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadSettings = async () => {
    try {
      const res = await authFetch(`${API_URL}/config`);
      const configs = await res.json();
      const pageConfig = configs.find(c => c.key === 'PAGE_URL');
      if (pageConfig) setPageUrl(pageConfig.value);

      const profileRes = await authFetch(`${API_URL}/bot/profile-status`);
      const profileData = await profileRes.json();
      setProfileExists(profileData.exists);

      const savedProfile = configs.find(c => c.key === 'CHROME_PROFILE');
      if (savedProfile) setSelectedProfile(savedProfile.value);

      setSafetySettings(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const item = configs.find(c => c.key === key);
          if (item?.value) next[key] = item.value;
        });
        return next;
      });
    } catch (err) {
      console.error('خطأ في تحميل الإعدادات من السيرفر');
    }
  };

  const loadChromeProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const res = await authFetch(`${API_URL}/bot/chrome-profiles`);
      const data = await res.json();
      setChromeProfiles(data.profiles || []);
    } catch (err) {
      console.error('فشل جلب قائمة بروفايلات Chrome');
    }
    setLoadingProfiles(false);
  };

  const savePageUrl = async () => {
    if (!pageUrl.trim()) {
      setMessage({ type: 'error', text: 'الرجاء إدخال رابط صفحة فيسبوك' });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/config/PAGE_URL`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: pageUrl })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '✅ تم حفظ رابط الصفحة بنجاح' });
      } else {
        let detail = 'فشل حفظ الرابط في السيرفر';
        try {
          const data = await res.json();
          detail = data.detail || data.message || detail;
        } catch {}
        setMessage({ type: 'error', text: `❌ ${detail}` });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ فشل الاتصال بالسيرفر' });
    }
    setSaving(false);
  };

  const saveChromeProfile = async () => {
    if (!selectedProfile) {
      setMessage({ type: 'error', text: 'الرجاء تحديد حساب من القائمة أولاً' });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authFetch(`${API_URL}/bot/set-chrome-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_folder: selectedProfile })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✅ تم اعتماد الحساب: ${data.profile_name}` });
        loadSettings(); // تحديث حالة الجلسة
      } else {
        setMessage({ type: 'error', text: data.detail || '❌ فشل تغيير الحساب' });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ خطأ في الاتصال' });
    }
    setSavingProfile(false);
  };

  const updateSafetySetting = (key, value) => {
    const cleanValue = String(Math.max(1, Number(value) || 1));
    setSafetySettings(prev => ({ ...prev, [key]: cleanValue }));
  };

  const saveSafetySettings = async () => {
    const normalized = {
      ...safetySettings,
      SAFETY_REST_AFTER_MAX_POSTS: String(Math.max(
        Number(safetySettings.SAFETY_REST_AFTER_MIN_POSTS),
        Number(safetySettings.SAFETY_REST_AFTER_MAX_POSTS)
      )),
      SAFETY_REST_MAX_MINUTES: String(Math.max(
        Number(safetySettings.SAFETY_REST_MIN_MINUTES),
        Number(safetySettings.SAFETY_REST_MAX_MINUTES)
      )),
    };

    setSavingSafety(true);
    try {
      await Promise.all(Object.entries(normalized).map(([key, value]) => (
        authFetch(`${API_URL}/config/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        })
      )));
      setSafetySettings(normalized);
      setMessage({ type: 'success', text: '✅ تم حفظ إعدادات حماية الحساب' });
    } catch {
      setMessage({ type: 'error', text: '❌ فشل حفظ إعدادات الحماية' });
    }
    setSavingSafety(false);
  };

  const handleLogout = async () => {
    if (!confirm('⚠️ هل أنت متأكد؟ سيتم الخروج من الحساب الحالي ومسح ملفات التعريف.')) return;
    try {
      const res = await authFetch(`${API_URL}/bot/logout`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'تم تسجيل الخروج ومسح الجلسة' });
        setProfileExists(false);
      }
    } catch {
      setMessage({ type: 'error', text: '❌ فشل تنفيذ العملية' });
    }
  };

  const copyAgentToken = async () => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
      if (!token) {
        setMessage({ type: 'error', text: 'سجل الدخول أولاً حتى يظهر توكن الـ Agent' });
        return;
      }
      await navigator.clipboard.writeText(token);
      setAgentTokenCopied(true);
      setMessage({ type: 'success', text: 'تم نسخ توكن الـ Agent' });
      setTimeout(() => setAgentTokenCopied(false), 2500);
    } catch {
      setMessage({ type: 'error', text: 'تعذر نسخ التوكن' });
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]" dir="rtl">
        
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-800">إعدادات التحكم الذكي</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* رسائل التنبيه */}
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold">{message.text}</span>
            </div>
          )}

          {/* القسم 1: رابط الصفحة */}
          <section>
            <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              رابط صفحة فيسبوك المستهدفة
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="https://www.facebook.com/ExamplePage"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-left font-mono"
                dir="ltr"
              />
              <button
                onClick={savePageUrl}
                disabled={saving}
                className="bg-gray-800 text-white px-5 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                {saving ? '...' : <Save className="w-5 h-5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => pageUrl && window.open(pageUrl, '_blank', 'noopener,noreferrer')}
              disabled={!pageUrl.trim()}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline"
            >
              فتح الرابط للتأكد
            </button>
          </section>

          {/* القسم 2: اختيار الحساب */}
          <section>
            <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-500" />
              اختيار حساب Chrome (Profile)
            </label>

            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto p-1 bg-gray-50 rounded-xl border">
              {loadingProfiles ? (
                <div className="text-center py-8 text-gray-400 text-sm">جاري البحث عن حسابات...</div>
              ) : chromeProfiles.map((profile) => (
                <div
                  key={profile.folder}
                  onClick={() => setSelectedProfile(profile.folder)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedProfile === profile.folder
                      ? 'border-blue-600 bg-blue-50 shadow-sm'
                      : 'border-transparent bg-white hover:border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black shadow-inner ${
                    selectedProfile === profile.folder ? 'bg-blue-600' : 'bg-gray-400'
                  }`}>
                    {profile.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-black text-gray-800 truncate">{profile.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{profile.folder}</p>
                  </div>
                  {selectedProfile === profile.folder && <CheckCircle className="w-5 h-5 text-blue-600" />}
                </div>
              ))}
            </div>

            <button
              onClick={saveChromeProfile}
              disabled={savingProfile || !selectedProfile}
              className="mt-3 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {savingProfile ? 'جاري الاعتماد...' : 'اعتماد هذا الحساب للبوت'}
            </button>
          </section>

          {/* القسم 3: حالة الدخول */}
          <section>
            <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              حماية الحساب من السلوك الآلي
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-gray-600">
                أقل فاصل بين المجموعات
                <input
                  type="number"
                  min="1"
                  value={safetySettings.SAFETY_MIN_DELAY_MINUTES}
                  onChange={e => updateSafetySetting('SAFETY_MIN_DELAY_MINUTES', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="text-xs font-bold text-gray-600">
                أقصى منشورات في اليوم
                <input
                  type="number"
                  min="1"
                  value={safetySettings.SAFETY_DAILY_POST_LIMIT}
                  onChange={e => updateSafetySetting('SAFETY_DAILY_POST_LIMIT', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="text-xs font-bold text-gray-600">
                راحة بعد عدد منشورات من
                <input
                  type="number"
                  min="1"
                  value={safetySettings.SAFETY_REST_AFTER_MIN_POSTS}
                  onChange={e => updateSafetySetting('SAFETY_REST_AFTER_MIN_POSTS', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="text-xs font-bold text-gray-600">
                إلى
                <input
                  type="number"
                  min="1"
                  value={safetySettings.SAFETY_REST_AFTER_MAX_POSTS}
                  onChange={e => updateSafetySetting('SAFETY_REST_AFTER_MAX_POSTS', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="text-xs font-bold text-gray-600">
                مدة الراحة من
                <input
                  type="number"
                  min="1"
                  value={safetySettings.SAFETY_REST_MIN_MINUTES}
                  onChange={e => updateSafetySetting('SAFETY_REST_MIN_MINUTES', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="text-xs font-bold text-gray-600">
                إلى
                <input
                  type="number"
                  min="1"
                  value={safetySettings.SAFETY_REST_MAX_MINUTES}
                  onChange={e => updateSafetySetting('SAFETY_REST_MAX_MINUTES', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
            </div>

            <button
              onClick={saveSafetySettings}
              disabled={savingSafety}
              className="mt-3 w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {savingSafety ? 'جاري الحفظ...' : 'حفظ إعدادات الحماية'}
            </button>
          </section>

          {/* القسم 4: حالة الدخول */}
          <section className="bg-gray-50 p-5 rounded-2xl border-2 border-dashed border-gray-200">
            <label className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              إدارة جلسة الدخول
            </label>

            <div className={`flex items-center gap-4 p-4 rounded-xl mb-5 ${
              profileExists ? 'bg-green-100/50' : 'bg-amber-100/50'
            }`}>
              {profileExists ? (
                <div className="bg-green-600 p-2 rounded-full"><CheckCircle className="w-5 h-5 text-white" /></div>
              ) : (
                <div className="bg-amber-600 p-2 rounded-full"><AlertCircle className="w-5 h-5 text-white" /></div>
              )}
              <div>
                <h4 className="text-sm font-black text-gray-800">
                  {profileExists ? 'الحساب جاهز للعمل' : 'مطلوب تسجيل دخول'}
                </h4>
                <p className="text-xs text-gray-500">
                  {profileExists ? 'توجد بيانات تسجيل دخول محفوظة لهذا البروفايل.' : 'يجب فتح المتصفح وتسجيل دخولك يدوياً لمرة واحدة.'}
                </p>
              </div>
            </div>

            <LoginBrowserButton onSuccess={() => { setProfileExists(true); loadSettings(); }} />

            {profileExists && (
              <button
                onClick={handleLogout}
                className="mt-4 w-full text-red-600 text-xs font-bold hover:underline flex items-center justify-center gap-1"
              >
                <LogOut className="w-3 h-3" /> مسح بيانات الجلسة الحالية
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <label className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              ربط Agent المحلي
            </label>
            <p className="mb-3 text-xs leading-6 text-gray-600">
              انسخ هذا التوكن والصقه في برنامج الـ Agent على جهاز المستخدم. التوكن يربط البرنامج بهذا الحساب فقط.
            </p>
            <button
              type="button"
              onClick={copyAgentToken}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              {agentTokenCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {agentTokenCopied ? 'تم النسخ' : 'نسخ توكن الـ Agent'}
            </button>
          </section>
        </div>

        <div className="p-5 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            إغلاق الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
