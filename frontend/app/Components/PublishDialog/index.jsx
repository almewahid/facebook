'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Share2, FilePlus2 } from 'lucide-react';
import PublishForm from './PublishForm';
import PublishProgress from './PublishProgress';
import PublishResults from './PublishResults';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function PublishDialog({ show, onClose, onSuccess, existingCategories = [], publishMethod = 'new_post' }) {
  const isSharePageMethod = publishMethod === 'share_page';
  const methodTitle = isSharePageMethod ? 'مشاركة منشور من الصفحة' : 'النشر بمنشور جديد';
  const MethodIcon = isSharePageMethod ? Share2 : FilePlus2;
  // ===== حالة المنشور =====
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUrlText, setVideoUrlText] = useState('🎥 لمشاهدة الفيديو، اضغط على الرابط التالي: 👇');
  const [error, setError] = useState('');

  // ===== خطوات العملية =====
  const [step, setStep] = useState('form'); // 'form' | 'publishing' | 'done'
  const [postId, setPostId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);

  // ===== جدولة وتبديل =====
  const [isScheduled, setIsScheduled] = useState(false);
  const [publishMode, setPublishMode] = useState('now');
  const [startTime, setStartTime] = useState('');
  const [delayMin, setDelayMin] = useState(1);
  const [delayMax, setDelayMax] = useState(12);
  const [scheduleTimes, setScheduleTimes] = useState(['09:00']);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [restDays, setRestDays] = useState([]);
  const [isRotation, setIsRotation] = useState(false);
  const [secondText, setSecondText] = useState('');

  // ===== قوائم المجموعات =====
  const [groups, setGroups] = useState([]);
  const [selectedList, setSelectedList] = useState('all');
  const [loadingGroups, setLoadingGroups] = useState(false);

  const pollRef = useRef();
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (show) {
      fetchGroups();
      setIsScheduled(true);
    } else {
      clearInterval(pollRef.current);
    }
  }, [show, publishMethod]);

  // ===== جلب المجموعات =====
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`${API_URL}/groups`);
      if (!res.ok) throw new Error();
      setGroups(await res.json());
    } catch (_) { }
    finally { setLoadingGroups(false); }
  };

  // ===== بناء القوائم من categories =====
  const categoriesFromGroups = [...new Set(groups.map(g => g.category || 'عام'))];
  const allCategories = [...new Set([...categoriesFromGroups, ...existingCategories])];

  const getTargetGroups = () => {
    if (selectedList === 'all') return groups.filter(g => g.is_active);
    return groups.filter(g => (g.category || 'عام') === selectedList && g.is_active);
  };
  const targetGroups = getTargetGroups();

  // ===== النشر =====
  const handlePublish = async () => {
    if (targetGroups.length === 0) { setError('لا توجد مجموعات نشطة'); return; }
    if (!isSharePageMethod && !text.trim()) { setError('الرجاء كتابة نص المنشور'); return; }
    if (isRotation && !secondText.trim()) { setError('اكتب نص المنشور الثاني لتفعيل التبديل'); return; }
    // منع الجمع بين فيديو مرفوع ورابط فيديو
    if (video && videoUrl.trim()) { setError('لا يمكن استخدام فيديو مرفوع ورابط فيديو معاً. اختر أحدهما فقط.'); return; }

    setError('');
    setStep('publishing');
    setResults([]);
    pollCountRef.current = 0;

    try {
      const isCampaign = isSharePageMethod || isScheduled || isRotation;

      if (isCampaign) {
        if (!isSharePageMethod && video) {
          throw new Error('الفيديو كملف غير مدعوم في الجدولة حالياً. أضف رابط الفيديو داخل النص أو استخدم النشر الفوري.');
        }

        const finalVideoUrl = videoUrl.trim();
        const baseTexts = isRotation ? [text, secondText] : [text];
        const textsWithVideoUrl = finalVideoUrl
          ? baseTexts.map(t => `${t}\n\n${videoUrlText}\n${finalVideoUrl}`)
          : baseTexts;

        const campaignData = {
          name: `حملة ${new Date().toLocaleString('ar-EG')}`,
          group_ids: targetGroups.map(g => g.id),
          texts: isSharePageMethod ? [] : textsWithVideoUrl,
          publish_method: publishMethod,
          start_time: (isScheduled && publishMode === 'scheduled' && startTime)
            ? startTime
            : null,
          delay_between_posts: Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin,
          rotation_strategy: 'sequential',
          schedule_times: (isScheduled && publishMode === 'times') ? scheduleTimes : [],
          rest_days: isScheduled ? restDays : [],
        };

        let res;
        if (!isSharePageMethod && images.length > 0) {
          const campaignForm = new FormData();
          campaignForm.append('name', campaignData.name);
          campaignForm.append('texts', JSON.stringify(campaignData.texts));
          campaignForm.append('publish_method', campaignData.publish_method);
          campaignData.group_ids.forEach(id => campaignForm.append('group_ids', id));
          if (campaignData.start_time) {
            campaignForm.append('start_time', campaignData.start_time);
          }
          campaignForm.append('delay_between_posts', campaignData.delay_between_posts);
          campaignForm.append('rotation_strategy', campaignData.rotation_strategy);
          campaignForm.append('schedule_times', JSON.stringify(campaignData.schedule_times));
          campaignForm.append('rest_days', JSON.stringify(campaignData.rest_days));
          images.forEach(img => campaignForm.append('images', img.file));
          res = await fetch(`${API_URL}/campaigns/media`, { method: 'POST', body: campaignForm });
        } else {
          res = await fetch(`${API_URL}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignData),
          });
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `خطأ ${res.status}`);
        }

        const data = await res.json();
        setPostId(data.id);
        onSuccess?.(data.id, 'campaign');
        setProgress({
          status: data.status,
          total_groups: data.total_groups,
          success_count: data.sent_count || 0,
          failed_count: 0,
          progress_percent: 0,
        });
        startPolling(data.id, true);
        return;
      }

      // نشر فوري
      const finalVideoUrl = videoUrl.trim();
      const textWithVideoUrl = finalVideoUrl ? `${text}\n\n${videoUrlText}\n${finalVideoUrl}` : text;

      const formData = new FormData();
      formData.append('text', textWithVideoUrl);
      formData.append('publish_method', publishMethod);
      targetGroups.forEach(g => formData.append('group_ids', g.id));
      images.forEach(img => formData.append('images', img.file));
      if (video) formData.append('video', video.file);

      const res = await fetch(`${API_URL}/publish`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `خطأ ${res.status}`);
      }

      const data = await res.json();
      setPostId(data.post_id);
      onSuccess?.(data.post_id, 'publish');
      setProgress({
        total_groups: data.total_groups,
        success_count: 0,
        failed_count: 0,
        status: 'publishing',
        progress_percent: 0,
      });
      startPolling(data.post_id, false);

    } catch (err) {
      setError(err.message);
      setStep('form');
    }
  };

  // ===== Polling =====
  const startPolling = (id, isCampaign) => {
    clearInterval(pollRef.current);
    const endpoint = isCampaign
      ? `${API_URL}/campaigns/${id}/live-status`
      : `${API_URL}/publish/${id}/status`;

    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const statusRes = await fetch(endpoint);
        if (!statusRes.ok) throw new Error('فشل جلب الحالة');
        const statusData = await statusRes.json();

        if (isCampaign) {
          setProgress({
            status: statusData.status,
            total_groups: statusData.progress?.total || 0,
            success_count: statusData.progress?.sent || 0,
            failed_count: 0,
            progress_percent: statusData.progress?.percent || 0,
          });
          setResults(statusData.recent_activity || []);
        } else {
          setProgress(statusData);
          if (statusData.results && Array.isArray(statusData.results)) {
            setResults(statusData.results);
          }
        }

        const isDone = ['done', 'failed', 'completed', 'cancelled'].includes(statusData.status);
        const isTimeout = pollCountRef.current >= 200;
        if (isDone || isTimeout) {
          clearInterval(pollRef.current);
          setStep('done');
        }
      } catch (err) {
        console.error('Polling Error:', err);
        if (pollCountRef.current >= 15) {
          clearInterval(pollRef.current);
          setStep('done');
        }
      }
    }, isCampaign ? 3000 : 2000);
  };

  // ===== إغلاق وتنظيف =====
  const handleClose = () => {
    clearInterval(pollRef.current);
    images.forEach(img => URL.revokeObjectURL(img.preview));
    if (video) URL.revokeObjectURL(video.preview);
    setText(''); setImages([]); setVideo(null); setVideoUrl('');
    setVideoUrlText('🎥 لمشاهدة الفيديو، اضغط على الرابط التالي: 👇');
    setIsScheduled(true); setPublishMode('now');
    setStep('form'); setPostId(null); setProgress(null);
    setResults([]); setError('');
    onClose();
  };

  if (!show) return null;

  // ===== UI =====
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MethodIcon className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{methodTitle}</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Steps */}
        {step === 'form' && (
          <PublishForm
            text={text} setText={setText}
            images={images} setImages={setImages}
            video={video} setVideo={setVideo}
            videoUrl={videoUrl} setVideoUrl={setVideoUrl}
            videoUrlText={videoUrlText} setVideoUrlText={setVideoUrlText}
            groups={groups}
            allCategories={allCategories}
            selectedList={selectedList} setSelectedList={setSelectedList}
            targetGroups={targetGroups}
            isScheduled={isScheduled} setIsScheduled={setIsScheduled}
            publishMode={publishMode} setPublishMode={setPublishMode}
            startTime={startTime} setStartTime={setStartTime}
            delayMin={delayMin} setDelayMin={setDelayMin}
            delayMax={delayMax} setDelayMax={setDelayMax}
            scheduleTimes={scheduleTimes} setScheduleTimes={setScheduleTimes}
            newScheduleTime={newScheduleTime} setNewScheduleTime={setNewScheduleTime}
            restDays={restDays} setRestDays={setRestDays}
            isRotation={isRotation} setIsRotation={setIsRotation}
            secondText={secondText} setSecondText={setSecondText}
            publishMethod={publishMethod}
            error={error}
            onClose={handleClose}
            onPublish={handlePublish}
          />
        )}

        {step === 'publishing' && (
          <PublishProgress
            progress={progress}
            results={results}
            onForceFinish={() => { clearInterval(pollRef.current); setStep('done'); }}
          />
        )}

        {step === 'done' && (
          <PublishResults
            progress={progress}
            results={results}
            postId={postId}
            onClose={handleClose}
          />
        )}

      </div>
    </div>
  );
}
