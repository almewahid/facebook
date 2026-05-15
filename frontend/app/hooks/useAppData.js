'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const CATEGORIES_STORAGE_KEY = 'fb_poster_extra_categories';

export function useAppData() {
  // ===== State =====
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

  const fetchJson = useCallback(async (path, fallback) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_URL}${path}`, { signal: controller.signal });
      if (!response.ok) return fallback;
      return await response.json();
    } catch {
      return fallback;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  // ===== Data fetching =====
  const fetchData = useCallback(async () => {
    try {
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
    } catch (error) {
      console.error('خطأ:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchJson]);

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_URL}/bot/logout`, { method: 'POST' });
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
        headers: { 'Content-Type': 'application/json' },
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
      }
    } catch {
      alert('❌ فشل في إضافة المجموعة');
    }
  };

  const handleUpdateGroup = async (groupId, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_URL}/groups/${groupId}`, { method: 'DELETE' });
      fetchData();
      alert('✅ تم الحذف');
    } catch {
      alert('❌ خطأ');
    }
  };

  return {
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
