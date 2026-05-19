'use client';

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, PlusCircle, ChevronDown, CreditCard, UsersRound, Settings2 } from 'lucide-react';
import Header from './Components/Header';
import Sidebar from './Components/Sidebar';
import Dashboard from './Components/Dashboard';
import { useAppData } from './hooks/useAppData';
import SmartScheduleDialog from './Components/SmartScheduleDialog';
import SmartModeDialog from './Components/SmartModeDialog';
import { authFetch } from './utils/authFetch';
import { isSupabaseAuthEnabled } from './utils/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const DEFAULT_PLATFORM_SETTINGS = {
  monthlyPlanLabel: 'شهري',
  yearlyPlanLabel: 'سنوي',
  manualPaymentInfo: '',
};

function AuthPanel({ mode, setMode, error, onLogin, onRegister, onGoogleLogin, onLoginWithGoogle, onClose }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const isRegister = mode === 'register';

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !onGoogleLogin) return;

    const renderGoogleButton = () => {
      const container = document.getElementById('google-signin-button');
      if (!container || !window.google?.accounts?.id) return;
      container.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) onGoogleLogin(response.credential);
        },
      });
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: isRegister ? 'signup_with' : 'signin_with',
        locale: 'ar',
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton, { once: true });
      return () => existingScript.removeEventListener('load', renderGoogleButton);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [isRegister, onGoogleLogin]);

  const submit = (e) => {
    e.preventDefault();
    if (isRegister) onRegister(form.full_name, form.email, form.password);
    else onLogin(form.email, form.password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facebook Auto Poster</h1>
            <p className="text-sm text-gray-500 mt-1">{isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول إلى حسابك'}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700">
              إغلاق
            </button>
          )}
        </div>
        {isRegister && (
          <input
            className="w-full border border-gray-200 rounded-md px-3 py-2"
            placeholder="الاسم"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        )}
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2"
          placeholder="البريد الإلكتروني"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2"
          placeholder="كلمة المرور"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 font-medium">
          {isRegister ? 'إنشاء الحساب' : 'دخول'}
        </button>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-100" />
          <span className="text-xs text-gray-400">أو</span>
          <span className="h-px flex-1 bg-gray-100" />
        </div>
        {isSupabaseAuthEnabled ? (
          <button
            type="button"
            onClick={onLoginWithGoogle}
            className="w-full rounded-md border border-gray-200 bg-white py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            المتابعة باستخدام Google
          </button>
        ) : GOOGLE_CLIENT_ID ? (
          <div id="google-signin-button" className="flex justify-center min-h-10" />
        ) : (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            تسجيل الدخول بجوجل يحتاج إضافة إعدادات Supabase أو مفاتيح Google في إعدادات التشغيل.
          </p>
        )}
        <button
          type="button"
          className="w-full text-sm text-blue-600"
          onClick={() => setMode(isRegister ? 'login' : 'register')}
        >
          {isRegister ? 'لديك حساب؟ سجل الدخول' : 'ليس لديك حساب؟ أنشئ حسابًا'}
        </button>
      </form>
    </div>
  );
}

function SubscriptionPanel({ subscription, onSubmitPayment, onLogout, onClose }) {
  const [plan, setPlan] = useState('monthly');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await onSubmitPayment({ plan, payment_reference: paymentReference, proof_url: proofUrl });
      setMessage('تم إرسال طلب الدفع. سيتم تفعيل الاشتراك من لوحة المدير بعد المراجعة.');
    } catch {
      setMessage('تعذر إرسال طلب الدفع حالياً.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-xl bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تفعيل الاشتراك</h1>
            <p className="text-sm text-gray-500 mt-1">اختر الخطة ثم أرسل رقم عملية التحويل ليتم التفعيل يدويًا.</p>
          </div>
          <button type="button" onClick={onClose || onLogout} className="text-sm text-gray-500">
            {onClose ? 'إغلاق' : 'خروج'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['monthly', 'yearly'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPlan(item)}
              className={`border rounded-md p-4 text-right ${plan === item ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
            >
              <p className="font-semibold">{item === 'monthly' ? 'شهري' : 'سنوي'}</p>
              <p className="text-xs text-gray-500 mt-1">{item === 'monthly' ? '30 يوم' : '365 يوم'}</p>
            </button>
          ))}
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">بيانات الدفع اليدوي</p>
          <p className="mt-1">رقم العملية هو رقم الإيصال أو المرجع الذي يظهر لك بعد التحويل البنكي أو فودافون كاش أو أي وسيلة دفع يدوية تحددها الإدارة.</p>
        </div>
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2"
          placeholder="رقم إيصال التحويل / Transaction ID"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
        />
        <input
          className="w-full border border-gray-200 rounded-md px-3 py-2"
          placeholder="رابط إثبات الدفع اختياري"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
        />
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2 font-medium">إرسال طلب التفعيل</button>
        {message && <p className="text-sm text-gray-700">{message}</p>}
        {subscription?.subscription?.status === 'pending' && <p className="text-sm text-amber-700">لديك طلب تفعيل قيد المراجعة.</p>}
      </form>
    </div>
  );
}

function AdminPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/admin/payments?status=pending`);
      setPayments(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  const activate = async (payment) => {
    const res = await authFetch(`${API_URL}/admin/users/${payment.user_id}/subscriptions/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: payment.plan,
        payment_id: payment.id,
        payment_reference: payment.payment_reference,
      }),
    });
    if (res.ok) loadPayments();
  };

  return (
    <section className="p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">طلبات تفعيل الاشتراك</h2>
          <button onClick={loadPayments} className="text-sm text-blue-600">{loading ? 'جاري التحديث...' : 'تحديث'}</button>
        </div>
        <div className="space-y-3">
          {payments.length === 0 && <p className="text-sm text-gray-500">لا توجد طلبات قيد المراجعة.</p>}
          {payments.map(payment => (
            <div key={payment.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-md p-3">
              <div className="text-sm">
                <p className="font-semibold text-gray-900">مستخدم #{payment.user_id} - {payment.plan === 'yearly' ? 'سنوي' : 'شهري'}</p>
                <p className="text-gray-500">رقم العملية: {payment.payment_reference || 'غير مضاف'}</p>
              </div>
              <button onClick={() => activate(payment)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 text-sm">
                تفعيل
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminControlPanel({ setView }) {
  const [section, setSection] = useState('subscriptions');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [platformSettings, setPlatformSettings] = useState(DEFAULT_PLATFORM_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fb_poster_admin_settings');
      if (saved) setPlatformSettings({ ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(saved) });
    } catch { /* keep defaults */ }
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authFetch(`${API_URL}/admin/users`);
      setUsers(res.ok ? await res.json() : []);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const savePlatformSettings = () => {
    localStorage.setItem('fb_poster_admin_settings', JSON.stringify(platformSettings));
    alert('تم حفظ إعدادات المنصة');
  };

  const cards = [
    {
      icon: CreditCard,
      title: 'طلبات الاشتراك',
      desc: 'مراجعة المدفوعات اليدوية وتفعيل الاشتراكات.',
      action: 'فتح',
      view: 'subscriptions',
      onClick: () => {
        setSection('subscriptions');
        setView('admin');
      },
    },
    {
      icon: UsersRound,
      title: 'المستخدمون',
      desc: 'عرض حسابات المستخدمين وحالة كل حساب.',
      action: 'فتح',
      view: 'users',
      onClick: () => setSection('users'),
    },
    {
      icon: Settings2,
      title: 'إعدادات المنصة',
      desc: 'ضبط أسماء الخطط وبيانات الدفع اليدوي.',
      action: 'فتح',
      view: 'settings',
      onClick: () => setSection('settings'),
    },
  ];

  return (
    <section className="p-6 space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map(({ icon: Icon, title, desc, action, view: cardView, onClick }) => (
          <div key={title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">{desc}</p>
            <button
              type="button"
              onClick={onClick || undefined}
              className={`mt-4 w-full rounded-md px-4 py-2 text-xs font-bold ${
                section === cardView
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {action}
            </button>
          </div>
        ))}
      </div>

      {section === 'subscriptions' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">طلبات الاشتراك</h2>
              <p className="mt-1 text-xs text-gray-400">افتح صفحة طلبات الاشتراك لمراجعة المدفوعات اليدوية وتفعيل الحسابات.</p>
            </div>
            <button onClick={() => setView('admin')} className="rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
              فتح طلبات الاشتراك
            </button>
          </div>
        </div>
      )}

      {section === 'users' && (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">المستخدمون</h2>
          </div>
          <button onClick={loadUsers} className="rounded-md border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
            {loadingUsers ? 'تحديث...' : 'تحديث'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-xs">
            <thead className="bg-gray-50 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">المستخدم</th>
                <th className="px-4 py-3 font-medium">الدور</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-400">لا توجد بيانات مستخدمين.</td>
                </tr>
              )}
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-800">{item.full_name || 'بدون اسم'}</p>
                    <p className="mt-0.5 text-gray-400">{item.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 font-bold ${item.role === 'admin' ? 'bg-slate-100 text-slate-800' : 'bg-blue-50 text-blue-700'}`}>
                      {item.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.is_active ? 'نشط' : 'موقوف'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {section === 'settings' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-900">إعدادات المنصة</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-gray-600">
              اسم الخطة الشهرية
              <input
                className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 font-normal text-gray-800"
                value={platformSettings.monthlyPlanLabel}
                onChange={(e) => setPlatformSettings({ ...platformSettings, monthlyPlanLabel: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold text-gray-600">
              اسم الخطة السنوية
              <input
                className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 font-normal text-gray-800"
                value={platformSettings.yearlyPlanLabel}
                onChange={(e) => setPlatformSettings({ ...platformSettings, yearlyPlanLabel: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold text-gray-600 md:col-span-2">
              بيانات الدفع اليدوي
              <textarea
                rows={4}
                className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 font-normal text-gray-800"
                value={platformSettings.manualPaymentInfo}
                onChange={(e) => setPlatformSettings({ ...platformSettings, manualPaymentInfo: e.target.value })}
                placeholder="اكتب بيانات التحويل التي تظهر للمستخدم في شاشة تفعيل الاشتراك"
              />
            </label>
          </div>
          <button onClick={savePlatformSettings} className="mt-5 rounded-md bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700">
            حفظ الإعدادات
          </button>
        </div>
      )}
    </section>
  );
}

// ── قائمة إدارة المجموعات المنسدلة ──────────────────────
function GroupActionsMenu({ onAddGroup, onImport, onBulkAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const actions = [
    { icon: '➕', label: 'إضافة مجموعة',    sublabel: 'مجموعة واحدة يدوياً',          onClick: onAddGroup },
    { icon: '📥', label: 'استيراد مجموعات', sublabel: 'من CSV أو Excel',              onClick: onImport  },
    { icon: '📝', label: 'إضافة جماعية',    sublabel: 'لصق روابط متعددة دفعة واحدة', onClick: onBulkAdd },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow transition-all"
      >
        <PlusCircle className="w-4 h-4" />
        إدارة المجموعات
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => { action.onClick(); setOpen(false); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-right"
            >
              <span className="text-xl mt-0.5">{action.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{action.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{action.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── الصفحة الرئيسية ──────────────────────────────────────
export default function Page() {
  const appData = useAppData();

  const [view, setView] = useState('dashboard');
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [publishMethod, setPublishMethod] = useState('new_post');

  const [showAddGroup,     setShowAddGroup]     = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkAdd,      setShowBulkAdd]      = useState(false);
  const [showSchedule,     setShowSchedule]     = useState(false);
  const [showReport,       setShowReport]       = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);
  const [showPublish,      setShowPublish]      = useState(false);
  const [showSmartMode,    setShowSmartMode]    = useState(false);
  const [showAddCategory,  setShowAddCategory]  = useState(false);
  const [showAuthGate,     setShowAuthGate]     = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);

  const [newGroup,        setNewGroup]        = useState({ name: '', url: '', is_active: true, category: 'عام' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [bulkGroups,      setBulkGroups]      = useState('');
  const [importFile,      setImportFile]      = useState(null);
  const [importResult,    setImportResult]    = useState(null);
  const subscriptionRequired = appData.token && !appData.subscription?.active && appData.user?.role !== 'admin';

  useEffect(() => {
    if (appData.token) setShowAuthGate(false);
  }, [appData.token]);

  useEffect(() => {
    if ((view === 'admin' || view === 'admin-control') && appData.user?.role !== 'admin') setView('dashboard');
  }, [view, appData.user?.role]);

  const requireLogin = (action) => (...args) => {
    if (!appData.token) {
      setShowAuthGate(true);
      return undefined;
    }
    return action?.(...args);
  };

  const requireServiceAccess = (action) => (...args) => {
    if (!appData.token) {
      setShowAuthGate(true);
      return undefined;
    }
    if (subscriptionRequired) {
      setShowSubscriptionGate(true);
      return undefined;
    }
    return action?.(...args);
  };

  const guardedSetDialog = (setter) => (value) => {
    if (value) requireLogin(() => setter(true))();
    else setter(false);
  };

  const guardedServiceDialog = (setter) => (value) => {
    if (value) requireServiceAccess(() => setter(true))();
    else setter(false);
  };

  const onAddGroupSubmit = (group = newGroup) => {
    requireLogin(() => appData.handleAddGroup(group, () => {
      setShowAddGroup(false);
      setNewGroup({ name: '', url: '', is_active: true, category: 'عام' });
    }))();
  };

  const onBulkAddSubmit = () => {
    requireLogin(() => appData.handleBulkAdd(bulkGroups, newGroup.category, () => {
      setShowBulkAdd(false);
      setBulkGroups('');
    }))();
  };

  const handleImportFile = async () => {
    if (!appData.token) { setShowAuthGate(true); return; }
    if (!importFile) { alert('الرجاء اختيار ملف'); return; }
    const formData = new FormData();
    formData.append('file', importFile);
    const ext = importFile.name.split('.').pop().toLowerCase();
    const endpoint = ext === 'csv' ? `${API_URL}/groups/import/csv` : `${API_URL}/groups/import/excel`;
    try {
      const response = await fetch(endpoint, { method: 'POST', body: formData, headers: appData.authHeaders() });
      const result = await response.json();
      if (result.success) { setImportResult(result); appData.fetchData(); }
      else alert(`❌ فشل: ${result.detail || result.message || result.errors?.join(', ') || 'تعذر استيراد الملف'}`);
    } catch { alert('❌ فشل الاستيراد. تأكد أن الباكند يعمل على 8001 وأن الملف مطابق للقالب.'); }
  };

  const downloadExcelTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/نموذج_المجموعات.xlsx';
    link.download = 'نموذج_المجموعات.xlsx';
    link.click();
  };

  if (appData.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-400 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* Sidebar ثابت على اليمين */}
      <Sidebar
        currentView={view}
        setView={setView}
        isLoggedIn={Boolean(appData.token)}
        isAdmin={appData.user?.role === 'admin'}
        user={appData.user}
        onLogin={() => setShowAuthGate(true)}
        onLogout={appData.logout}
      />

      {/* المحتوى الرئيسي مع مسافة للـ Sidebar */}
      <div className="mr-64 flex flex-col min-h-screen">

        {/* Header */}
        <Header
          onSettings={requireLogin(() => setShowSettings(true))}
          onStopBot={requireLogin(appData.stopBot)}
          botStatus={appData.botStatus}
          groupActionsMenu={
            <GroupActionsMenu
              onAddGroup={requireLogin(() => setShowAddGroup(true))}
              onImport={requireLogin(() => setShowImportDialog(true))}
              onBulkAdd={requireLogin(() => setShowBulkAdd(true))}
            />
          }
        />

        {/* Dashboard */}
        <main className="flex-1">
          {view === 'admin-control' && appData.user?.role === 'admin' ? (
            <AdminControlPanel setView={setView} />
          ) : view === 'admin' && appData.user?.role === 'admin' ? <AdminPanel /> : <Dashboard
            stats={appData.stats}
            groups={appData.groups}
            posts={appData.posts}
            botStatus={appData.botStatus}
            existingCategories={appData.existingCategories}
            activeCampaignId={activeCampaignId}
            setActiveCampaignId={setActiveCampaignId}
            view={view} setView={setView}
            showAddGroup={showAddGroup}     setShowAddGroup={guardedSetDialog(setShowAddGroup)}
            showImportDialog={showImportDialog} setShowImportDialog={guardedSetDialog(setShowImportDialog)}
            showBulkAdd={showBulkAdd}       setShowBulkAdd={guardedSetDialog(setShowBulkAdd)}
            showSchedule={showSchedule}     setShowSchedule={guardedSetDialog(setShowSchedule)}
            showReport={showReport}         setShowReport={setShowReport}
            showSettings={showSettings}     setShowSettings={guardedSetDialog(setShowSettings)}
            showPublish={showPublish}        setShowPublish={guardedServiceDialog(setShowPublish)}
            publishMethod={publishMethod}     setPublishMethod={setPublishMethod}
            showSmartMode={showSmartMode}   setShowSmartMode={guardedSetDialog(setShowSmartMode)}
            showAddCategory={showAddCategory} setShowAddCategory={setShowAddCategory}
            newGroup={newGroup}             setNewGroup={setNewGroup}
            newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName}
            searchQuery={searchQuery}       setSearchQuery={setSearchQuery}
            bulkGroups={bulkGroups}         setBulkGroups={setBulkGroups}
            importFile={importFile}         setImportFile={setImportFile}
            importResult={importResult}     setImportResult={setImportResult}
            onToggleGroup={requireLogin(appData.toggleGroup)}
            onDeleteGroup={requireLogin(appData.deleteGroup)}
            onAddGroup={onAddGroupSubmit}
            onUpdateGroup={requireLogin(appData.handleUpdateGroup)}
            onBulkAdd={onBulkAddSubmit}
            onImportFile={handleImportFile}
            onDownloadTemplate={downloadExcelTemplate}
            onAddCategory={requireLogin(appData.handleAddCategory)}
            onDeleteCategory={requireLogin(appData.handleDeleteCategory)}
          />}
        </main>
      </div>

      <SmartScheduleDialog
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        onStartBot={requireLogin((cfg) => appData.startBot(cfg))}
        existingCategories={appData.existingCategories}
      />
      <SmartModeDialog open={showSmartMode} onClose={() => setShowSmartMode(false)} />
      {showAuthGate && (
        <div className="fixed inset-0 z-[70] bg-black/40">
          <AuthPanel
            mode={appData.authMode}
            setMode={appData.setAuthMode}
            error={appData.authError}
            onLogin={appData.login}
            onRegister={appData.register}
            onGoogleLogin={appData.googleLogin}
            onLoginWithGoogle={appData.loginWithGoogle}
            onClose={() => setShowAuthGate(false)}
          />
        </div>
      )}
      {showSubscriptionGate && (
        <div className="fixed inset-0 z-[70] bg-black/40">
          <SubscriptionPanel
            subscription={appData.subscription}
            onSubmitPayment={appData.submitManualPayment}
            onLogout={appData.logout}
            onClose={() => setShowSubscriptionGate(false)}
          />
        </div>
      )}
    </div>
  );
}
