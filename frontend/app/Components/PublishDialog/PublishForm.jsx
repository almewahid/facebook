'use client';

import Image from 'next/image';
import { useRef } from 'react';
import {
  Send, Image as ImageIcon, Video, FileText,
  List, Link, XCircle, X, Loader2, Plus, Trash2, Share2
} from 'lucide-react';

export default function PublishForm({
  // نص المنشور
  text, setText,
  // صور وفيديو
  images, setImages,
  video, setVideo,
  videoUrl, setVideoUrl,
  videoUrlText, setVideoUrlText,
  // قوائم المجموعات
  groups,
  allCategories,
  selectedList, setSelectedList,
  targetGroups,
  // جدولة وتبديل
  isScheduled, setIsScheduled,
  publishMode, setPublishMode,
  startTime, setStartTime,
  delayMin, setDelayMin,
  delayMax, setDelayMax,
  scheduleTimes, setScheduleTimes,
  newScheduleTime, setNewScheduleTime,
  restDays, setRestDays,
  isRotation, setIsRotation,
  secondText, setSecondText,
  publishMethod,
  // خطأ وإجراءات
  error,
  onClose,
  onPublish,
}) {
  const imageInputRef = useRef();
  const videoInputRef = useRef();
  const isSharePageMethod = publishMethod === 'share_page';
  const weekDays = [
    { k: 'sun', l: 'الأحد' },
    { k: 'mon', l: 'الاثنين' },
    { k: 'tue', l: 'الثلاثاء' },
    { k: 'wed', l: 'الأربعاء' },
    { k: 'thu', l: 'الخميس' },
    { k: 'fri', l: 'الجمعة' },
    { k: 'sat', l: 'السبت' },
  ];
  const activePublishDays = weekDays.filter(d => !restDays.includes(d.k));

  const togglePublishDay = (dayKey) => {
    setRestDays(prev => (
      prev.includes(dayKey)
        ? prev.filter(k => k !== dayKey)
        : [...prev, dayKey]
    ));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    e.target.value = '';
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) setVideo({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const removeVideo = () => setVideo(null);

  return (
    <>
      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* اختيار القائمة */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <List className="w-4 h-4 text-blue-500" />
              النشر في
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              <button
                onClick={() => setSelectedList('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedList === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                🌐 جميع المجموعات ({groups.filter(g => g.is_active).length})
              </button>
              {allCategories.map(cat => {
                const count = groups.filter(g => (g.category || 'عام') === cat && g.is_active).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedList(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedList === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    📋 {cat} ({count})
                  </button>
                );
              })}
            </div>
            {targetGroups.length > 0 ? (
              <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                ✅ سيتم النشر في <strong>{targetGroups.length}</strong> مجموعة نشطة
              </p>
            ) : (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
                ⚠️ لا توجد مجموعات نشطة في هذه القائمة
              </p>
            )}
          </div>

          {isSharePageMethod ? (
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
              <label className="flex items-center gap-2 text-sm font-bold text-purple-900 mb-2">
                <Share2 className="w-4 h-4 text-purple-600" />
                مشاركة منشور من الصفحة
              </label>
              <p className="text-xs text-purple-700 leading-relaxed">
                سيتم استخدام رابط الصفحة المحفوظ في الإعدادات، ثم مشاركة منشور الصفحة داخل المجموعات المختارة حسب الجدولة التي تحددها هنا.
              </p>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-500" />
                نص المنشور *
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={5}
                placeholder="اكتب نص المنشور هنا..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-400 text-left mt-1">{text.length} حرف</div>
            </div>
          )}

          {/* ⚙️ خيارات الجدولة والتبديل */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <Loader2 className={`w-4 h-4 ${isScheduled ? 'animate-spin' : ''}`} />
                جدولة النشر وتأخير الوقت
              </label>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
            </div>

            {isScheduled && (
              <div className="space-y-4">
                {/* الآن أم أوقات محددة */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">وقت النشر</label>
                  <div className="flex gap-2">
                    {[
                      { val: 'now', label: '⚡ الآن' },
                      { val: 'scheduled', label: '🕐 وقت محدد' },
                      { val: 'times', label: '📅 أوقات يومية' },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setPublishMode(val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                          publishMode === val
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* وقت محدد */}
                {publishMode === 'scheduled' && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">وقت البدء</label>
                    <input
                      type="datetime-local"
                      className="w-full text-xs p-2 border rounded-lg"
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                )}

                {/* أوقات النشر اليومية */}
                {publishMode === 'times' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-2">أوقات النشر اليومية</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {scheduleTimes.map(t => (
                        <div key={t} className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-2 py-1 text-xs font-mono">
                          {t}
                          <button
                            onClick={() => { if (scheduleTimes.length > 1) setScheduleTimes(prev => prev.filter(x => x !== t)); }}
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
                        value={newScheduleTime}
                        onChange={e => setNewScheduleTime(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      />
                      <button
                        onClick={() => {
                          if (!newScheduleTime || scheduleTimes.includes(newScheduleTime)) return;
                          setScheduleTimes(prev => [...prev, newScheduleTime].sort());
                          setNewScheduleTime('');
                        }}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" /> إضافة
                      </button>
                    </div>
                  </div>
                )}

                {/* الفاصل العشوائي */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-3">
                  <label className="text-xs font-semibold text-gray-700 block">⏱ الفاصل العشوائي بين المجموعات</label>
                  <div className="flex items-center justify-center gap-3">
                    <span className="bg-white border border-indigo-200 rounded-lg px-2 py-1 font-bold text-indigo-700 min-w-[48px] text-center text-xs">{delayMin} د</span>
                    <div className="flex-1 flex items-center gap-0.5">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? 'bg-indigo-300' : i < 6 ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
                      ))}
                    </div>
                    <span className="bg-white border border-indigo-200 rounded-lg px-2 py-1 font-bold text-indigo-700 min-w-[48px] text-center text-xs">{delayMax} د</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>الحد الأدنى</span><span>{delayMin} دقيقة</span>
                    </div>
                    <input type="range" min={1} max={119} value={delayMin}
                      onChange={e => { const v = Number(e.target.value); setDelayMin(v); if (v >= delayMax) setDelayMax(v + 1); }}
                      className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>الحد الأقصى</span><span>{delayMax} دقيقة</span>
                    </div>
                    <input type="range" min={2} max={120} value={delayMax}
                      onChange={e => { const v = Number(e.target.value); setDelayMax(v); if (v <= delayMin) setDelayMin(v - 1); }}
                      className="w-full accent-indigo-600" />
                  </div>
                </div>

                {/* أيام النشر */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">📅 أيام النشر</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {weekDays.map(d => (
                      <button key={d.k}
                        onClick={() => togglePublishDay(d.k)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          !restDays.includes(d.k)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                        }`}
                      >
                        {d.l}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    الأيام المظللة هي التي سيتم النشر فيها فقط.
                  </p>
                </div>

                {/* ملخص الجدول */}
                <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">📋 ملخص الجدول</p>
                  <p className="text-xs text-gray-600">
                    ينشر <span className="font-bold text-blue-700">{scheduleTimes.length} مرة</span>
                    {activePublishDays.length > 0 && (
                      <> في <span className="font-bold text-blue-700">{activePublishDays.map(d => d.l).join('، ')}</span></>
                    )}
                    {activePublishDays.length === 0 && <> — ⚠️ لم يتم اختيار أي يوم نشر</>}
                    {' '}— فاصل عشوائي <span className="font-bold text-blue-700">{delayMin}–{delayMax} دقيقة</span>
                  </p>
                </div>
              </div>
            )}

            {/* التبديل بين منشورين */}
            {!isSharePageMethod && (
            <div className="pt-2 border-t border-blue-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRotation}
                  onChange={(e) => setIsRotation(e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs font-bold text-gray-700">تفعيل التبديل بين منشورين (Rotation)</span>
              </label>
              {isRotation && (
                <textarea
                  value={secondText}
                  onChange={(e) => setSecondText(e.target.value)}
                  placeholder="اكتب نص المنشور الثاني هنا للتبديل..."
                  className="w-full mt-2 p-2 text-xs border border-blue-200 rounded-lg h-20 resize-none bg-white"
                />
              )}
            </div>
            )}
          </div>

          {/* الصور */}
          {!isSharePageMethod && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 text-green-500" />
              الصور (اختياري)
            </label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group w-20 h-20">
                    <Image
                      src={img.preview}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => imageInputRef.current.click()} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" /> اضغط لإضافة صور
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
          </div>
          )}

          {/* الفيديو */}
          {!isSharePageMethod && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Video className="w-4 h-4 text-purple-500" />
              فيديو (اختياري)
            </label>
            {video ? (
              <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <Video className="w-5 h-5 text-purple-500 shrink-0" />
                <span className="text-sm text-gray-700 truncate flex-1">{video.file.name}</span>
                <button onClick={removeVideo} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => videoInputRef.current.click()} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
                <Video className="w-4 h-4" /> اضغط لإضافة فيديو
              </button>
            )}
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
          </div>
          )}

          {/* رابط الفيديو */}
          {!isSharePageMethod && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Link className="w-4 h-4 text-indigo-500" />
              رابط فيديو (اختياري)
            </label>
            {/* تحذير عند التعارض بين فيديو مرفوع ورابط */}
            {video && videoUrl.trim() && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-700">
                ⚠️ لا يمكن استخدام فيديو مرفوع ورابط فيديو معاً. احذف أحدهما قبل النشر.
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                disabled={!!video}
                placeholder={video ? 'احذف الفيديو المرفوع أولاً لاستخدام الرابط' : 'أدخل رابط الفيديو (مثل رابط يوتيوب أو فيسبوك)'}
                className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${video ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-200'}`}
              />
              {videoUrl.trim() && !video && (
                <>
                  <input
                    type="text"
                    value={videoUrlText}
                    onChange={e => setVideoUrlText(e.target.value)}
                    placeholder="الجملة التحفيزية قبل الرابط"
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                  {/* معاينة مباشرة لما سيُضاف أسفل المنشور */}
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs leading-relaxed">
                    <p className="text-indigo-600 font-semibold mb-1">📋 سيُضاف أسفل المنشور:</p>
                    <p className="text-gray-500 whitespace-pre-wrap">{videoUrlText}{'\n'}{videoUrl}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* رسالة الخطأ */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <XCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
          إلغاء
        </button>
        <button
          onClick={onPublish}
          disabled={(!isSharePageMethod && !text.trim()) || targetGroups.length === 0}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {isSharePageMethod ? 'متابعة مشاركة منشور الصفحة' : `نشر في ${targetGroups.length} مجموعة`}
        </button>
      </div>
    </>
  );
}
