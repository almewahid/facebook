'use client';

import { useState, useEffect } from 'react';
import { 
  Play, Pause, RefreshCw, Plus, Search, Calendar, 
  TrendingUp, Users, CheckCircle, XCircle, Clock,
  BarChart3, Activity, Brain, Settings as SettingsIcon
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'http://localhost:8000/api/v1';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [botStatus, setBotStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  
  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', is_active: true });
  const [bulkGroups, setBulkGroups] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [settings, setSettings] = useState({
    minDelay: 60,
    maxDelay: 120,
    maxGroups: 7,
    cycleDuration: 3600,
    customContent: ''
  });
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: true,
    start_hour: 8,
    end_hour: 18,
    max_groups_per_session: 5,
    min_delay: 90,
    max_delay: 150,
    rest_days: [5],
    randomize_start: true
  });
  const [schedulePresets, setSchedulePresets] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Fetch data
  useEffect(() => {
    fetchData();
    fetchScheduleData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, groupsRes, postsRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/stats`),
        fetch(`${API_URL}/groups`),
        fetch(`${API_URL}/posts?limit=20`),
        fetch(`${API_URL}/bot/status`)
      ]);

      setStats(await statsRes.json());
      setGroups(await groupsRes.json());
      setPosts(await postsRes.json());
      setBotStatus(await statusRes.json());
      setLoading(false);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      setLoading(false);
    }
  };

  const fetchScheduleData = async () => {
    try {
      const [configRes, presetsRes] = await Promise.all([
        fetch(`${API_URL}/schedule`),
        fetch(`${API_URL}/schedule/presets`)
      ]);
      
      setScheduleConfig(await configRes.json());
      setSchedulePresets(await presetsRes.json());
    } catch (error) {
      console.error('خطأ في جلب بيانات الجدولة:', error);
    }
  };

  // Bot control
  const startBot = async () => {
    try {
      console.log('محاولة تشغيل البوت...');
      const response = await fetch(`${API_URL}/bot/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      
      const data = await response.json();
      console.log('استجابة البوت:', data);
      
      if (response.ok) {
        alert('✅ تم تشغيل البوت بنجاح!');
        fetchData();
      } else {
        alert(`❌ خطأ: ${data.detail || 'فشل تشغيل البوت'}`);
      }
    } catch (error) {
      console.error('خطأ في تشغيل البوت:', error);
      alert('❌ خطأ في الاتصال بالسيرفر. تأكد من تشغيل Backend!');
    }
  };

  const stopBot = async () => {
    try {
      console.log('محاولة إيقاف البوت...');
      const response = await fetch(`${API_URL}/bot/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      
      const data = await response.json();
      console.log('استجابة البوت:', data);
      
      if (response.ok) {
        alert('✅ تم إيقاف البوت بنجاح!');
        fetchData();
      } else {
        alert(`❌ خطأ: ${data.detail || 'فشل إيقاف البوت'}`);
      }
    } catch (error) {
      console.error('خطأ في إيقاف البوت:', error);
      alert('❌ خطأ في الاتصال بالسيرفر');
    }
  };

  const logoutFacebook = async () => {
    if (!confirm('⚠️ هل أنت متأكد من تسجيل الخروج؟\n\nسيتم حذف جلسة فيسبوك وستحتاج لتسجيل الدخول مرة أخرى.')) {
      return;
    }

    try {
      if (botStatus?.is_running) {
        alert('⚠️ سيتم إيقاف البوت أولاً...');
        await stopBot();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('محاولة تسجيل الخروج...');
      const response = await fetch(`${API_URL}/bot/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      console.log('استجابة تسجيل الخروج:', data);
      
      if (response.ok) {
        alert(`✅ ${data.message}\n\n💡 عند تشغيل البوت مرة أخرى، سيفتح Chrome ويطلب منك تسجيل الدخول.`);
        fetchData();
      } else {
        alert(`❌ خطأ: ${data.detail || 'فشل تسجيل الخروج'}`);
      }
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      alert('❌ خطأ في الاتصال بالسيرفر');
    }
  };

  // Group management
  const addGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      });
      
      if (response.ok) {
        alert('تم إضافة المجموعة بنجاح!');
        setNewGroup({ name: '', is_active: true });
        setShowAddGroup(false);
        fetchData();
      }
    } catch (error) {
      alert('خطأ في إضافة المجموعة');
    }
  };

  const addBulkGroups = async (e) => {
    e.preventDefault();
    try {
      const groupNames = bulkGroups
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      if (groupNames.length === 0) {
        alert('⚠️ الرجاء إدخال أسماء المجموعات');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const name of groupNames) {
        try {
          const response = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, is_active: true })
          });
          
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      alert(`✅ نجح: ${successCount}\n❌ فشل: ${failCount}`);
      setBulkGroups('');
      setShowBulkAdd(false);
      fetchData();
    } catch (error) {
      alert('❌ خطأ في إضافة المجموعات');
    }
  };

  const toggleGroup = async (groupId, currentStatus) => {
    try {
      await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchData();
    } catch (error) {
      alert('خطأ في تحديث المجموعة');
    }
  };

  const updateGroup = async (id, data) => {
    try {
      await fetch(`${API_URL}/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      fetchData();
    } catch (error) {
      alert('خطأ في تحديث المجموعة');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;
    
    try {
      await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'DELETE'
      });
      fetchData();
    } catch (error) {
      alert('خطأ في حذف المجموعة');
    }
  };

  // Settings
  const updateSettings = async (e) => {
    e.preventDefault();
    try {
      const requests = [
        fetch(`${API_URL}/config/MIN_DELAY_BETWEEN_GROUPS`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: settings.minDelay.toString() })
        }),
        fetch(`${API_URL}/config/MAX_DELAY_BETWEEN_GROUPS`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: settings.maxDelay.toString() })
        })
      ];

      // إضافة المحتوى المخصص إذا موجود
      if (settings.customContent && settings.customContent.trim()) {
        requests.push(
          fetch(`${API_URL}/config/CUSTOM_POST_CONTENT`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: settings.customContent })
          })
        );
      }

      await Promise.all(requests);
      alert('✅ تم تحديث الإعدادات بنجاح!');
      setShowSettings(false);
    } catch (error) {
      console.error('خطأ في تحديث الإعدادات:', error);
      alert('❌ خطأ في تحديث الإعدادات');
    }
  };

  const updateSchedule = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleConfig)
      });
      
      if (response.ok) {
        alert('✅ تم تحديث الجدولة بنجاح!');
        setShowSchedule(false);
        fetchScheduleData();
      } else {
        alert('❌ خطأ في تحديث الجدولة');
      }
    } catch (error) {
      console.error('خطأ في تحديث الجدولة:', error);
      alert('❌ خطأ في الاتصال بالسيرفر');
    }
  };

  const applyPreset = (presetKey) => {
    const preset = schedulePresets[presetKey];
    setScheduleConfig({
      ...scheduleConfig,
      start_hour: preset.start_hour,
      end_hour: preset.end_hour,
      max_groups_per_session: preset.groups_per_session,
      min_delay: preset.min_delay,
      max_delay: preset.max_delay
    });
  };

  // Filter posts by date
  const filteredPosts = posts.filter(post => {
    if (!dateRange.from || !dateRange.to) return true;
    const postDate = new Date(post.created_at);
    return postDate >= new Date(dateRange.from) && postDate <= new Date(dateRange.to);
  });

  // Filter groups by search
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Facebook Auto Poster</h1>
                <p className="text-sm text-gray-500">لوحة تحكم البوت الذكي</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 space-x-reverse">
              <button
                onClick={logoutFacebook}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 space-x-reverse transition"
                title="تسجيل الخروج من فيسبوك"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>تسجيل الخروج</span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 space-x-reverse transition"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>الإعدادات</span>
              </button>
              
              {botStatus?.is_running ? (
                <button
                  onClick={stopBot}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center space-x-2 space-x-reverse transition"
                >
                  <Pause className="w-4 h-4" />
                  <span>إيقاف البوت</span>
                </button>
              ) : (
                <button
                  onClick={startBot}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 space-x-reverse transition"
                >
                  <Play className="w-4 h-4" />
                  <span>تشغيل البوت</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="المنشورات الناجحة"
            value={stats?.successful_posts || 0}
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="معدل النجاح"
            value={`${stats?.success_rate || 0}%`}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            title="المجموعات النشطة"
            value={`${stats?.active_groups || 0}/${stats?.total_groups || 0}`}
            color="purple"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            title="إجمالي المنشورات"
            value={stats?.total_posts || 0}
            color="orange"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <ActionCard
            icon={<Plus className="w-5 h-5" />}
            title="إضافة مجموعة"
            description="مجموعة واحدة"
            onClick={() => setShowAddGroup(true)}
            color="blue"
          />
          <ActionCard
            icon={<Users className="w-5 h-5" />}
            title="إضافة متعددة"
            description="عدة مجموعات دفعة واحدة"
            onClick={() => setShowBulkAdd(true)}
            color="blue"
          />
          <ActionCard
            icon={<Users className="w-5 h-5" />}
            title="إدارة المجموعات"
            description={`${groups.length} مجموعة`}
            onClick={() => setShowGroupManager(true)}
            color="green"
          />
          <ActionCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="تقرير مفصل"
            description="عرض تقارير المنشورات"
            onClick={() => setShowReport(true)}
            color="purple"
          />
          <ActionCard
            icon={<Calendar className="w-5 h-5" />}
            title="⏰ الجدولة الذكية"
            description="توقيت تلقائي + أيام راحة"
            onClick={() => setShowSchedule(true)}
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>معدل النجاح (آخر 7 أيام)</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={generateChartData(posts)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="نجاح" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="فشل" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span>أداء المجموعات</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={groups.slice(0, 5).map(g => ({
                name: g.name.substring(0, 15) + '...',
                نجاح: g.success_count,
                فشل: g.failure_count
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="نجاح" fill="#10b981" />
                <Bar dataKey="فشل" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">آخر المنشورات</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموعة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنشور</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدة</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {posts.slice(0, 10).map(post => {
                  const group = groups.find(g => g.id === post.group_id);
                  return (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{group?.name || 'غير معروف'}</td>
                      <td className="px-4 py-3">
                        {post.post_url ? (
                          <a 
                            href={post.post_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 space-x-reverse"
                          >
                            <span>عرض</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {post.duration_seconds ? `${post.duration_seconds.toFixed(1)}ث` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(post.created_at).toLocaleString('ar-EG')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddGroup && (
        <Modal onClose={() => setShowAddGroup(false)} title="إضافة مجموعة جديدة">
          <form onSubmit={addGroup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المجموعة
              </label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: مصريون بالكويت"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={newGroup.is_active}
                onChange={(e) => setNewGroup({ ...newGroup, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="mr-2 text-sm text-gray-700">مجموعة نشطة</label>
            </div>
            <div className="flex space-x-3 space-x-reverse pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                إضافة
              </button>
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showBulkAdd && (
        <Modal onClose={() => setShowBulkAdd(false)} title="إضافة مجموعات متعددة" size="large">
          <form onSubmit={addBulkGroups} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                أسماء المجموعات (سطر لكل مجموعة)
              </label>
              <textarea
                value={bulkGroups}
                onChange={(e) => setBulkGroups(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="مصريون بالكويت
عرب في أمريكا  
مغتربون في أوروبا
..."
                rows={10}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 اكتب كل اسم مجموعة في سطر جديد
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                📊 عدد المجموعات: {bulkGroups.split('\n').filter(name => name.trim()).length}
              </p>
            </div>

            <div className="flex space-x-3 space-x-reverse pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                إضافة الكل
              </button>
              <button
                type="button"
                onClick={() => setShowBulkAdd(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} title="إعدادات البوت">
          <form onSubmit={updateSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأدنى للانتظار بين المجموعات (ثانية)
              </label>
              <input
                type="number"
                value={settings.minDelay}
                onChange={(e) => setSettings({ ...settings, minDelay: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="30"
                max="300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الحد الأقصى للانتظار بين المجموعات (ثانية)
              </label>
              <input
                type="number"
                value={settings.maxDelay}
                onChange={(e) => setSettings({ ...settings, maxDelay: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="60"
                max="600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 محتوى المنشور المخصص (اختياري)
              </label>
              <textarea
                value={settings.customContent}
                onChange={(e) => setSettings({ ...settings, customContent: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="اكتب محتوى المنشور هنا...

إذا تركته فارغاً، سيستخدم AI لتوليد محتوى تلقائي"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 سيستخدم هذا المحتوى في جميع المنشورات بدلاً من AI
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 الانتظار العشوائي بين {settings.minDelay} و {settings.maxDelay} ثانية يساعد في تجنب الحظر
              </p>
            </div>
            <div className="flex space-x-3 space-x-reverse pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showGroupManager && (
        <Modal onClose={() => setShowGroupManager(false)} title="إدارة المجموعات" size="large">
          <div className="space-y-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في المجموعات..."
                  className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{group.name}</h4>
                    <p className="text-sm text-gray-600">
                      ✅ {group.success_count} نجاح | ❌ {group.failure_count} فشل
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => updateGroup(group.id, { is_active: !group.is_active })}
                      className={`px-3 py-1 rounded-lg text-sm transition ${
                        group.is_active 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {group.is_active ? 'نشط' : 'متوقف'}
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showReport && (
        <Modal onClose={() => setShowReport(false)} title="تقرير المنشورات" size="large">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المجموعة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المنشور</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المدة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الدورة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPosts.map((post, idx) => {
                    const group = groups.find(g => g.id === post.group_id);
                    return (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm">{group?.name || 'غير معروف'}</td>
                        <td className="px-4 py-3">
                          {post.post_url ? (
                            <a 
                              href={post.post_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              رابط
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
                        <td className="px-4 py-3 text-sm">
                          {post.duration_seconds ? `${post.duration_seconds.toFixed(1)}ث` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{post.cycle_number}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(post.created_at).toLocaleString('ar-EG')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
      
      {showSchedule && schedulePresets && (
        <Modal onClose={() => setShowSchedule(false)} title="⏰ الجدولة الذكية" size="large">
          <form onSubmit={updateSchedule} className="space-y-6">
            
            {/* Presets */}
            <div>
              <h3 className="font-semibold text-lg mb-3">📊 الإعدادات المحددة مسبقاً</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(schedulePresets).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`p-4 rounded-lg border-2 text-right hover:shadow-md transition ${
                      key === 'conservative' ? 'border-green-500 bg-green-50' :
                      key === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
                      key === 'intensive' ? 'border-orange-500 bg-orange-50' :
                      'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{preset.name}</span>
                      <span className="text-sm">{preset.safety}</span>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>📊 {preset.max_groups} مجموعة/يوم</div>
                      <div>⏰ {preset.hours} ساعة عمل</div>
                      <div>⏱️ انتظار: {preset.min_delay}-{preset.max_delay}ث</div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Safety Warning Table */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">📊 جدول مقارنة الأمان</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-300">
                      <th className="text-right py-2 px-3">المستوى</th>
                      <th className="text-right py-2 px-3">المجموعات/يوم</th>
                      <th className="text-right py-2 px-3">ساعات العمل</th>
                      <th className="text-right py-2 px-3">الأمان</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-blue-200">
                      <td className="py-2 px-3 font-medium">محافظ</td>
                      <td className="py-2 px-3">50</td>
                      <td className="py-2 px-3">10 ساعات</td>
                      <td className="py-2 px-3">🟢 99% آمن</td>
                    </tr>
                    <tr className="border-b border-blue-200">
                      <td className="py-2 px-3 font-medium">متوسط</td>
                      <td className="py-2 px-3">100</td>
                      <td className="py-2 px-3">12 ساعة</td>
                      <td className="py-2 px-3">🟡 90% آمن</td>
                    </tr>
                    <tr className="border-b border-blue-200">
                      <td className="py-2 px-3 font-medium">مكثف</td>
                      <td className="py-2 px-3">150</td>
                      <td className="py-2 px-3">15 ساعة</td>
                      <td className="py-2 px-3">🟠 75% آمن</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">خطر</td>
                      <td className="py-2 px-3">200+</td>
                      <td className="py-2 px-3">18 ساعة</td>
                      <td className="py-2 px-3">🔴 40% آمن</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-blue-800 mt-2">
                💡 <strong>تنبيه:</strong> البوت سيتوقف تلقائياً خارج ساعات العمل المحددة
              </p>
            </div>

            {/* Enable/Disable */}
            <div className="flex items-center bg-gray-50 p-3 rounded-lg">
              <input
                type="checkbox"
                checked={scheduleConfig.enabled}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="mr-3 text-sm font-medium text-gray-700">
                تفعيل الجدولة الذكية
              </label>
            </div>

            {/* Time Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🌅 ساعة البداية
                </label>
                <select
                  value={scheduleConfig.start_hour}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, start_hour: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!scheduleConfig.enabled}
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00 {i < 12 ? 'صباحاً' : 'مساءً'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🌙 ساعة النهاية
                </label>
                <select
                  value={scheduleConfig.end_hour}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, end_hour: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!scheduleConfig.enabled}
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00 {i < 12 ? 'صباحاً' : 'مساءً'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Groups per Session */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 عدد المجموعات في كل دورة
              </label>
              <input
                type="number"
                value={scheduleConfig.max_groups_per_session}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, max_groups_per_session: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="20"
                disabled={!scheduleConfig.enabled}
              />
            </div>

            {/* Delay Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏱️ الحد الأدنى للانتظار (ثانية)
                </label>
                <input
                  type="number"
                  value={scheduleConfig.min_delay}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, min_delay: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="30"
                  max="300"
                  disabled={!scheduleConfig.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">مثال: 90 ثانية (1.5 دقيقة)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏱️ الحد الأقصى للانتظار (ثانية)
                </label>
                <input
                  type="number"
                  value={scheduleConfig.max_delay}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, max_delay: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="60"
                  max="600"
                  disabled={!scheduleConfig.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">مثال: 150 ثانية (2.5 دقيقة)</p>
              </div>
            </div>

            {/* Explanation Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2 space-x-reverse">
                <span className="text-2xl">💡</span>
                <div className="flex-1 text-sm text-yellow-800">
                  <p className="font-semibold mb-2">لماذا الانتظار العشوائي؟</p>
                  <p className="mb-2">البوت ينتظر وقتاً <strong>عشوائياً</strong> بين الحد الأدنى والأقصى قبل النشر في المجموعة التالية:</p>
                  <div className="bg-white rounded p-2 font-mono text-xs">
                    المجموعة 1 → انتظار {scheduleConfig.min_delay} ثانية<br/>
                    المجموعة 2 → انتظار {Math.floor((scheduleConfig.min_delay + scheduleConfig.max_delay) / 2)} ثانية<br/>
                    المجموعة 3 → انتظار {scheduleConfig.max_delay} ثانية
                  </div>
                  <p className="mt-2">هذا يحاكي السلوك البشري الطبيعي ويمنع فيسبوك من اكتشاف البوت! 🤖</p>
                </div>
              </div>
            </div>

            {/* Rest Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 أيام الراحة (البوت سيتوقف تلقائياً)
              </label>
              <div className="grid grid-cols-7 gap-2">
                {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const currentRestDays = scheduleConfig.rest_days || [];
                      const newRestDays = currentRestDays.includes(index)
                        ? currentRestDays.filter(d => d !== index)
                        : [...currentRestDays, index];
                      setScheduleConfig({ ...scheduleConfig, rest_days: newRestDays });
                    }}
                    className={`py-2 px-1 text-xs rounded-lg transition ${
                      (scheduleConfig.rest_days || []).includes(index)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={!scheduleConfig.enabled}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">اضغط على اليوم لتحديده كيوم راحة</p>
            </div>

            {/* Randomize Start */}
            <div className="flex items-center bg-gray-50 p-3 rounded-lg">
              <input
                type="checkbox"
                checked={scheduleConfig.randomize_start}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, randomize_start: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={!scheduleConfig.enabled}
              />
              <label className="mr-3 text-sm text-gray-700">
                🎲 تنويع وقت البداية يومياً (±30 دقيقة)
              </label>
            </div>

            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ ملخص الإعدادات</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>⏰ ساعات العمل: {scheduleConfig.start_hour}:00 - {scheduleConfig.end_hour}:00 ({scheduleConfig.end_hour - scheduleConfig.start_hour} ساعات)</p>
                <p>📊 المجموعات/دورة: {scheduleConfig.max_groups_per_session}</p>
                <p>🔄 الدورات/يوم: {scheduleConfig.end_hour - scheduleConfig.start_hour}</p>
                <p>📈 إجمالي المجموعات/يوم: {scheduleConfig.max_groups_per_session * (scheduleConfig.end_hour - scheduleConfig.start_hour)}</p>
                <p>⏱️ الانتظار: {scheduleConfig.min_delay}-{scheduleConfig.max_delay} ثانية (عشوائي)</p>
                <p>📅 أيام الراحة: {(scheduleConfig.rest_days || []).length > 0 ? (scheduleConfig.rest_days || []).map(d => ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][d]).join(', ') : 'لا يوجد'}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 space-x-reverse pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                💾 حفظ الإعدادات
              </button>
              <button
                type="button"
                onClick={() => setShowSchedule(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

// Helper Components
function StatCard({ icon, title, value, color }) {
  const colors = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description, onClick, color }) {
  const colors = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  };

  return (
    <button
      onClick={onClick}
      className={`${colors[color]} text-white rounded-xl p-6 text-right hover:shadow-lg transition transform hover:-translate-y-1`}
    >
      <div className="flex items-center space-x-3 space-x-reverse mb-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm opacity-90">{description}</p>
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-blue-100 text-blue-700'
  };

  const labels = {
    success: 'نجح',
    failed: 'فشل',
    skipped: 'تخطي',
    pending: 'قيد الانتظار'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}

function Modal({ children, onClose, title, size = 'medium' }) {
  const sizes = {
    medium: 'max-w-md',
    large: 'max-w-3xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-xl ${sizes[size]} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function generateChartData(posts) {
  if (!posts || posts.length === 0) {
    return [{ name: 'لا توجد بيانات', نجاح: 0, فشل: 0 }];
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split('T')[0],
      name: date.toLocaleDateString('ar-EG', { weekday: 'short' })
    });
  }

  return days.map(day => {
    const dayPosts = posts.filter(post => {
      const postDate = new Date(post.created_at).toISOString().split('T')[0];
      return postDate === day.date;
    });

    return {
      name: day.name,
      نجاح: dayPosts.filter(p => p.status === 'success').length,
      فشل: dayPosts.filter(p => p.status === 'failed').length
    };
  });
}
