"use client";

import { authFetch } from '../utils/authFetch';
import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function useCountdown(nextPostTime) {
  const [seconds, setSeconds] = useState(null);
  useEffect(() => {
    if (!nextPostTime) { setSeconds(null); return; }
    const calc = () => {
      const diff = Math.max(0, Math.floor((parseCairoDate(nextPostTime) - Date.now()) / 1000));
      setSeconds(diff);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [nextPostTime]);
  return seconds;
}

function parseCairoDate(isoStr) {
  if (!isoStr) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(isoStr);
  return new Date(hasTimezone ? isoStr : `${isoStr}+03:00`);
}

function formatCairoTime(isoStr) {
  if (!isoStr) return '';
  try {
    return parseCairoDate(isoStr).toLocaleTimeString('ar-EG', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Africa/Cairo'
    });
  } catch { return isoStr; }
}

function formatCairoDateTime(isoStr) {
  if (!isoStr) return '';
  try {
    const date = parseCairoDate(isoStr);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const targetDay = date.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const time = formatCairoTime(isoStr);
    if (targetDay === today) return time;
    const day = date.toLocaleDateString('ar-EG', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      timeZone: 'Africa/Cairo'
    });
    return `${day} - ${time}`;
  } catch { return formatCairoTime(isoStr); }
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return 'أقل من دقيقة';
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0 && h > 0) return `${d} يوم و${h} ساعة${m > 0 ? ` و${m} دقيقة` : ''}`;
  if (d > 0) return `${d} يوم${m > 0 ? ` و${m} دقيقة` : ''}`;
  if (h > 0 && m > 0) return `${h} ساعة و${m} دقيقة`;
  if (h > 0) return `${h} ساعة`;
  return `${m} دقيقة`;
}

function formatCountdown(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return {
      value: `${days} يوم ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      label: 'يوم ساعة : دقيقة : ثانية'
    };
  }

  if (hours > 0) {
    return {
      value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      label: 'ساعة : دقيقة : ثانية'
    };
  }

  return {
    value: `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    label: 'دقيقة : ثانية'
  };
}

function isPendingApproval(post) {
  if (!post) return false;
  if (post.status === 'pending_approval') return true;
  const msg = (post.error_message || post.error || '').toLowerCase();
  return ['pending', 'approval', 'requires admin', 'موافقة', 'انتظار موافقة'].some(k => msg.includes(k));
}

function getReadableAlert(alert) {
  const text = `${alert?.msg || ''} ${alert?.details || ''}`;
  const dailyLimitMatch = text.match(/الحد اليومي الآمن\s*\(([^)]+)\)/);
  if (dailyLimitMatch) {
    return `توقف النشر لأن حد الحماية اليومي وصل إلى ${dailyLimitMatch[1]}. يمكنك تعديل هذا الرقم من الإعدادات.`;
  }
  return alert?.msg || '';
}

const CampaignMonitor = ({ campaignId, publishId }) => {
  const [data, setData] = useState(null);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef(null);
  const targetId = publishId || campaignId;
  const isPublish = Boolean(publishId);
  const countdown = useCountdown(data?.next_post_time);

  const handleStop = async () => {
    if (!confirm('هل أنت متأكد من إيقاف النشر؟')) return;
    setStopping(true);
    try {
      const endpoint = isPublish
        ? `${API_URL}/publish/${targetId}/stop`
        : `${API_URL}/campaigns/${targetId}/stop`;
      const res = await authFetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error();
      clearInterval(intervalRef.current);
      setData(prev => ({ ...prev, status: 'cancelled' }));
      window.dispatchEvent(new Event('bot-status-changed'));
    } catch {
      alert('❌ فشل إيقاف النشر');
    } finally {
      setStopping(false);
    }
  };

  useEffect(() => {
    if (!targetId) return;
    const fetchStatus = async () => {
      try {
        const endpoint = isPublish
          ? `${API_URL}/publish/${targetId}/status`
          : `${API_URL}/campaigns/${targetId}/live-status`;
        const res = await authFetch(endpoint);
        if (!res.ok) throw new Error();
        const result = await res.json();
        setData(result);
        if (['done', 'failed', 'completed', 'cancelled'].includes(result.status)) {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        console.error("❌ فشل جلب الحالة:", err);
      }
    };
    intervalRef.current = setInterval(fetchStatus, 2000);
    fetchStatus();
    return () => clearInterval(intervalRef.current);
  }, [targetId, isPublish]);

  if (!data) return <div className="p-4 text-center text-gray-500">⏳ جاري ربط البيانات الحية...</div>;

  const title = isPublish ? `متابعة النشر #${data.post_id}` : `متابعة الحملة: ${data.name}`;
  const sentCount = data.progress?.sent ?? 0;
  const failedCount = data.progress?.failed ?? 0;
  const totalCount = data.progress?.total ?? 0;
  const progressPercent = data.progress?.percent ?? 0;
  const pendingApprovalCount = data.progress?.pending_approval ?? 0;
  const activity = isPublish ? data.results : (data.results || data.recent_activity);
  const isWaitingBot = data.status === 'waiting_bot';
  const isRunning = ['active', 'publishing'].includes(data.status);
  const showNextPostTimer = isRunning;
  const countdownView = formatCountdown(Math.max(0, countdown ?? 0));

  const getArabicStatus = (s) => ({
    pending: 'قيد الانتظار', success: 'نجاح', sent: 'تم الإرسال',
    failed: 'فشل', done: 'مكتمل', completed: 'مكتمل', cancelled: 'ملغى',
    active: 'جاري التنفيذ', publishing: 'جاري التنفيذ',
    waiting_bot: 'بانتظار تشغيل البوت', pending_approval: 'بانتظار موافقة المدير',
  }[s] || s);

  const getStatusStyle = (post) => {
    if (isPendingApproval(post)) return 'text-yellow-600 font-medium';
    const s = post.status || '';
    if (['success', 'sent'].includes(s)) return 'text-green-600 font-medium';
    if (s === 'failed') return 'text-red-500';
    return 'text-gray-400';
  };

  const getStatusIcon = (post) => {
    if (isPendingApproval(post)) return '⏳';
    const s = post.status || '';
    if (['success', 'sent'].includes(s)) return '✅';
    if (s === 'failed') return '❌';
    return '🔄';
  };

  const getDisplayItem = (item, idx) => {
    if (!isPublish || !isRunning || item.status !== 'pending') return item;
    const processed = sentCount + failedCount + pendingApprovalCount;
    if (idx === processed) {
      return { ...item, status: 'publishing' };
    }
    return item;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8">

      {/* رأس */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">📊 {title}</h2>
        <div className="flex items-center gap-3">
          {(isRunning || isWaitingBot) && (
            <button onClick={handleStop} disabled={stopping}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
              {stopping ? '⏳ جاري الإيقاف...' : '⏹ إيقاف النشر'}
            </button>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${isWaitingBot ? 'bg-yellow-100 text-yellow-700' :
              isRunning ? 'bg-green-100 text-green-700' :
                data.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'}`}>
            ● {getArabicStatus(data.status)}
          </span>
        </div>
      </div>

      {/* شريط التقدم */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">نسبة الإنجاز</span>
          <span className="font-bold text-primary-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-primary-600 h-3 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${progressPercent}%` }} />
        </div>
        {/* ✅ إحصائيات مفصّلة */}
        <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
          <span>📊 الكل: <strong>{totalCount}</strong></span>
          <span className="text-green-600">✅ نجح: <strong>{sentCount}</strong></span>
          <span className="text-red-500">❌ فشل: <strong>{failedCount}</strong></span>
          {pendingApprovalCount > 0 && (
            <span className="text-yellow-600">⏳ انتظار موافقة: <strong>{pendingApprovalCount}</strong></span>
          )}
        </div>
      </div>

      {/* ✅ تقدير وقت الانتهاء */}
      {isRunning && (data.estimated_remaining_minutes ?? 0) > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 flex justify-between items-center">
          <span>⏰ وقت الانتهاء المتوقع</span>
          <span className="font-semibold text-gray-800">
            {formatCairoDateTime(data.estimated_finish_time)}
            <span className="text-gray-400 font-normal mr-2">
              (بعد {formatDuration(data.estimated_remaining_minutes)})
            </span>
          </span>
        </div>
      )}

      {/* ✅ المجموعة التي تُنشر الآن */}
      {isRunning && data.current_group && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-green-700 font-bold mb-0.5">🟢 يُنشر الآن في:</p>
            <p className="text-sm font-semibold text-green-800">{data.current_group.group_name}</p>
          </div>
          <span className="text-xs text-green-500 animate-pulse">جاري النشر...</span>
        </div>
      )}

      {/* ✅ العداد التنازلي */}
      {showNextPostTimer && (
        <div className="mb-6 flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div>
            <p className="text-xs text-blue-600 font-semibold mb-0.5">⏱ المنشور القادم خلال</p>
            <p className="text-xs text-gray-400">
              {data.next_post_time ? formatCairoDateTime(data.next_post_time) : '00:00'}
            </p>
          </div>
          <div className="text-left">
            <div className="text-left">
              <span className={`font-mono text-2xl font-bold ${countdown === 0 ? 'text-green-600' : 'text-blue-700'}`}>
                {countdownView.value}
              </span>
              <p className="text-xs text-blue-400 mt-0.5 text-center">{countdownView.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* سجل المنشورات أو خطة النشر */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">خطة النشر / سجل العمليات:</h3>
        {(data.plan || activity)?.map((rawItem, idx) => {
          const item = getDisplayItem(rawItem, idx);
          const isApproval = isPendingApproval(item);
          return (
            <div key={idx} className={`flex justify-between items-center p-2 rounded text-sm ${isApproval ? 'bg-yellow-50 border border-yellow-100' : 'bg-gray-50'}`}>
              <div className="flex flex-col">
                <span className="text-gray-700 font-medium">
                  {item.group_name || `مجموعة ID: ${item.group_id}`}
                </span>
                {item.scheduled_time && (
                  <span className="text-xs text-gray-400">
                    ⏰ سيتم النشر حوالي: {formatCairoTime(item.scheduled_time)}
                  </span>
                )}
              </div>
              {(item.url || item.post_url) ? (
                <a href={item.url || item.post_url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1 ${getStatusStyle(item)} hover:underline hover:opacity-80 transition-opacity`}
                  title="فتح المنشور في علامة تبويب جديدة"
                >
                  <span>{getStatusIcon(item)}</span>
                  <span>{isApproval ? 'بانتظار موافقة المدير' : getArabicStatus(item.status || 'pending')}</span>
                </a>
              ) : (
                <span className={`flex items-center gap-1 ${getStatusStyle(item)}`}>
                  <span>{getStatusIcon(item)}</span>
                  <span>{isApproval ? 'بانتظار موافقة المدير' : getArabicStatus(item.status || 'pending')}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* تنبيهات */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="animate-pulse">🔔</span> سجل التنبيهات والأحداث:
          </h3>
          <div className="space-y-2">
            {data.alerts.map((alert, index) => {
              const isApprovalAlert = isPendingApproval({ error_message: `${alert.msg} ${alert.details}` });
              const icon = isApprovalAlert ? '⏳' : (alert.level === 'error' ? '❌' : (alert.level === 'info' || alert.level === 'success' ? '✅' : '⚠️'));
              return (
                <div key={index} className={`p-3 rounded-lg text-xs flex flex-col gap-1 border ${isApprovalAlert ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    alert.level === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
                    (alert.level === 'info' || alert.level === 'success') ? 'bg-green-50 text-green-700 border-green-100' :
                      'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                  <div className="flex justify-between">
                    <span className="font-bold">{icon} {getReadableAlert(alert)}</span>
                    {/* ✅ الوقت الصحيح بتوقيت القاهرة */}
                    <span className="opacity-60">{alert.time ? formatCairoTime(alert.time) : 'الآن'}</span>
                  </div>
                  {isApprovalAlert && (
                    <span className="text-yellow-600 font-medium">
                      المنشور معلق — يحتاج موافقة مدير المجموعة، ليس خطأً حقيقياً
                    </span>
                  )}
                  {alert.details && <span className="opacity-80 italic">{alert.details}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignMonitor;
