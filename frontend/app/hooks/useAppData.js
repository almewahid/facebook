'use client';

import { useState, useEffect } from 'react';

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

  // ===== Data fetching =====
  const fetchData = async () => {
    try {
      const [statsRes, groupsRes, postsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/stats`),
        fetch(`${API_URL}/groups`),
        fetch(`${API_URL}/posts?limit=20`),
        fetch(`${API_URL}/bot/status`),
      ]);
      setStats(await statsRes.json());
      setGroups(await groupsRes.json());
      setPosts(await postsRes.json());
      setBotStatus(await statusRes.json());
      setLoading(false);
    } catch (error) {
      console.error('خطأ:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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
      await fetch(`${API_URL}/bot/stop`, { method: 'POST' });
      alert('✅ تم إيقاف البوت!');
      setTimeout(fetchData, 1500);
    } catch {
      alert('❌ خطأ');
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