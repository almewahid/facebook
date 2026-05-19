'use client';

import { useState, useEffect, useCallback } from 'react';
import { isSupabaseAuthEnabled, supabase } from '../utils/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const CATEGORIES_STORAGE_KEY = 'fb_poster_extra_categories';
const TOKEN_STORAGE_KEY = 'fb_poster_access_token';

export function useAppData() {
  // ===== State =====
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(TOKEN_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [billingPlans, setBillingPlans] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [botStatus, setBotStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // القوائم المضافة يدوياً
  const [manualCategories, setManualCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ===== Derived =====
  const categoriesFromGroups = [...new Set(groups.map(g => g.category).filter(Boolean))];
  const existingCategories = [...new Set([...categoriesFromGroups, ...manualCategories])];

  const authHeaders = useCallback((extra = {}) => ({
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchJson = useCallback(async (path, fallback) => {
    if (!token) return fallback;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_URL}${path}`, {
        signal: controller.signal,
        headers: authHeaders(),
      });
      if (!response.ok) return fallback;
      return await response.json();
    } catch {
      return fallback;
    } finally {
      clearTimeout(timeout);
    }
  }, [authHeaders, token]);

  const authRequest = useCallback(async (path, body) => {
    setAuthError('');
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('تعذر الاتصال بالسيرفر. تأكد أن Backend يعمل وأن الواجهة أُعيد تشغيلها.');
    }

    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.detail || data.message || raw || `تعذر تنفيذ الطلب (${response.status})`);
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const applySupabaseSession = useCallback(async (session) => {
    if (!session?.access_token) throw new Error('تعذر إنشاء جلسة Supabase');
    localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
    setToken(session.access_token);
    return session;
  }, []);

  const login = async (email, password) => {
    setAuthError('');
    if (isSupabaseAuthEnabled) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthError(error.message); return null; }
      return applySupabaseSession(data.session);
    }
    return authRequest('/auth/login', { email, password }).catch((err) => setAuthError(err.message));
  };

  const register = async (full_name, email, password) => {
    setAuthError('');
    if (isSupabaseAuthEnabled) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });
      if (error) { setAuthError(error.message); return null; }
      if (data.session) return applySupabaseSession(data.session);
      setAuthError('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الدخول.');
      return null;
    }
    return authRequest('/auth/register', { full_name, email, password }).catch((err) => setAuthError(err.message));
  };

  const googleLogin = useCallback((credential) => (
    authRequest('/auth/google', { credential }).catch((err) => setAuthError(err.message))
  ), [authRequest]);
  const loginWithGoogle = useCallback(async () => {
    setAuthError('');
    if (!isSupabaseAuthEnabled) {
      setAuthError('أضف إعدادات Supabase لتفعيل تسجيل الدخول بجوجل.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
  }, []);

  const logout = () => {
    if (isSupabaseAuthEnabled) supabase.auth.signOut();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setUser(null);
    setSubscription(null);
  };

  const submitManualPayment = async ({ plan, service_key, payment_reference, proof_url }) => {
    const response = await fetch(`${API_URL}/billing/payments/manual`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ plan, service_key, payment_reference, proof_url, payment_method: 'manual' }),
    });
    if (!response.ok) throw new Error('تعذر إرسال طلب الدفع');
    await refreshSubscription();
    return response.json();
  };

  const refreshSubscription = useCallback(async () => {
    if (!token) return null;
    const data = await fetchJson('/billing/subscription', { active: false, subscription: null });
    setSubscription(data);
    return data;
  }, [fetchJson, token]);

  // ===== Data fetching =====
  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [meData, subscriptionData] = await Promise.all([
        fetchJson('/auth/me', null),
        fetchJson('/billing/subscription', { active: false, subscription: null }),
      ]);
      setUser(meData);
      setSubscription(subscriptionData);
      const [statsData, groupsData, postsData, statusData] = await Promise.all([
        fetchJson('/stats', {
          total_posts: 0,
          successful_posts: 0,
          active_groups: 0,
        }),
        fetchJson('/groups', []),
        fetchJson('/posts?limit=1000', []),
        fetchJson('/bot/status', { is_running: false }),
      ]);
      setStats(statsData);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setPosts(Array.isArray(postsData) ? postsData : []);
      setBotStatus(statusData || { is_running: false });
      setBillingPlans(await fetchJson('/billing/plans', null));
    } catch (error) {
      console.error('خطأ:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchJson, token]);

  useEffect(() => {
    if (!isSupabaseAuthEnabled) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.session.access_token);
        setToken(data.session.access_token);
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
        setToken(session.access_token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken('');
        setUser(null);
        setSubscription(null);
      }
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    window.addEventListener('bot-status-changed', fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('bot-status-changed', fetchData);
    };
  }, [fetchData]);

  // ===== Bot controls =====
  const startBot = async (scheduleConfig = null) => {
    try {
      const body = { force: false };
      if (scheduleConfig) {
        body.schedule = {
          times:       scheduleConfig.times,
          restDays:    scheduleConfig.restDays,
          intervalMin: scheduleConfig.intervalMin,
          intervalMax: scheduleConfig.intervalMax,
        };
      }
      const response = await fetch(`${API_URL}/bot/start`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (response.ok) {
        alert('✅ تم تشغيل البوت!');
        setTimeout(fetchData, 1500);
      }
    } catch {
      alert('❌ خطأ في الاتصال بالسيرفر');
    }
  };

  const stopBot = async () => {
    try {
      const response = await fetch(`${API_URL}/bot/stop`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ force: false }),
      });
      if (!response.ok) throw new Error();
      const stoppedStatus = { is_running: false, active_publishes: 0, active_campaigns: 0 };
      setBotStatus(prev => ({ ...(prev || {}), ...stoppedStatus }));
      window.dispatchEvent(new Event('bot-status-changed'));
      alert('✅ تم إيقاف كل عمليات النشر!');
      setTimeout(fetchData, 500);
    } catch {
      alert('❌ تعذر إيقاف البوت');
    }
  };

  const logoutFacebook = async () => {
    if (!confirm('⚠️ هل أنت متأكد؟')) return;
    try {
      await fetch(`${API_URL}/bot/logout`, { method: 'POST', headers: authHeaders() });
      alert('✅ تم تسجيل الخروج!');
      fetchData();
    } catch {
      alert('❌ خطأ');
    }
  };

  // ===== Categories handlers =====
  const handleAddCategory = (name) => {
    if (!name || !name.trim()) return;
    if (existingCategories.includes(name)) return;

    const updated = [...manualCategories, name];
    setManualCategories(updated);

    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleDeleteCategory = (categoryName) => {
    if (categoriesFromGroups.includes(categoryName)) {
      alert('⚠️ لا يمكن حذف قائمة تحتوي على مجموعات');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف القائمة "${categoryName}"؟`)) return;
    const updated = manualCategories.filter(c => c !== categoryName);
    setManualCategories(updated);
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // ===== Group handlers =====
  const handleAddGroup = async (groupData, onSuccessCallback) => {
    if (!groupData.name.trim()) { alert('الرجاء إدخال اسم المجموعة'); return; }
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: groupData.name,
          url: groupData.url || null,
          is_active: groupData.is_active,
          category: groupData.category,
        }),
      });
      if (response.ok) {
        fetchData();
        alert('✅ تمت إضافة المجموعة وتصنيفها!');
        if(onSuccessCallback) onSuccessCallback();
      } else {
        const raw = await response.text();
        let message = raw;
        try {
          const data = raw ? JSON.parse(raw) : {};
          message = data.detail || data.message || raw;
        } catch { /* keep raw message */ }
        alert(`❌ تعذر إضافة المجموعة: ${message || response.status}`);
      }
    } catch (error) {
      alert(`❌ فشل في إضافة المجموعة: ${error.message || 'تعذر الاتصال بالسيرفر'}`);
    }
  };

  const handleUpdateGroup = async (groupId, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updatedData),
      });
      if (response.ok) fetchData();
    } catch {
      alert('❌ فشل في تحديث البيانات');
    }
  };

  const handleBulkAdd = async (bulkGroupsText, category, onSuccessCallback) => {
    if (!bulkGroupsText.trim()) { alert('الرجاء إدخال أسماء المجموعات'); return; }
    const lines = bulkGroupsText.split('\n').filter(l => l.trim());
    let successCount = 0;

    for (const line of lines) {
      try {
        const response = await fetch(`${API_URL}/groups`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            name: line.trim(),
            url: null,
            is_active: true,
            category: category,
          }),
        });
        if (response.ok) successCount++;
      } catch { /* skip failed lines */ }
    }

    fetchData();
    alert(`✅ تمت إضافة ${successCount} من ${lines.length} مجموعة في قائمة (${category})!`);
    if(onSuccessCallback) onSuccessCallback();
  };

  const toggleGroup = async (groupId, currentStatus) => {
    try {
      await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      fetchData();
    } catch {
      alert('❌ خطأ');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm('هل أنت متأكد؟')) return;
    try {
      await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE', headers: authHeaders() });
      fetchData();
      alert('✅ تم الحذف');
    } catch {
      alert('❌ خطأ');
    }
  };

  return {
    token,
    user,
    subscription,
    billingPlans,
    authMode,
    setAuthMode,
    authError,
    login,
    register,
    googleLogin,
    loginWithGoogle,
    logout,
    submitManualPayment,
    authHeaders,
    stats,
    groups,
    posts,
    botStatus,
    loading,
    existingCategories,
    fetchData,
    startBot,
    stopBot,
    logoutFacebook,
    handleAddCategory,
    handleDeleteCategory,
    handleAddGroup,
    handleUpdateGroup,
    handleBulkAdd,
    toggleGroup,
    deleteGroup
  };
}
