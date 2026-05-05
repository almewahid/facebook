"""
محرك الذكاء الاصطناعي باستخدام Google Gemini Pro
إصدار 2026 المحدث: يتضمن نظام مراقبة التيرمنال وتوافق كامل مع قاعدة البيانات
"""

import os
import time
import google.generativeai as genai
from datetime import datetime
from app.database import SessionLocal
from app import models

class AIEngine:
    def __init__(self):
        # قراءة المفتاح من ملف .env
        api_key = os.getenv('GEMINI_API_KEY')
        
        if api_key:
            genai.configure(api_key=api_key)
            try:
                # البحث التلقائي عن أفضل موديل متاح في حسابك
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        self.model = genai.GenerativeModel(m.name)
                        print(f"✅ تم تفعيل Gemini بنجاح: {m.name}")
                        break
                self.enabled = True
            except Exception as e:
                print(f"❌ فشل تهيئة Gemini: {e}")
                self.enabled = False
        else:
            print("⚠️ تنبيه: GEMINI_API_KEY غير موجود في ملف .env")
            self.enabled = False
        
        self.db = SessionLocal()
    
    def analyze_best_posting_times(self):
        print("\n🔍 [1/3] جاري تحليل أفضل أوقات النشر...")
        if not self.enabled: return None
        try:
            posts = self.db.query(models.Post).filter(models.Post.status == "success").all()
            print(f"📊 تم العثور على {len(posts)} منشور ناجح.")
            
            # شرط مخفف للبيانات لضمان العمل الآن
            if len(posts) < 1: 
                print("ℹ️ بيانات غير كافية لتحليل الأوقات.")
                return "بحاجة لمزيد من المنشورات الناجحة."
            
            prompt = f"لدي {len(posts)} منشور ناجح على فيسبوك. اقترح أفضل أوقات النشر بالعربية باختصار."
            response = self.model.generate_content(prompt)
            
            self._save_insight(content=response.text, cat="performance")
            print("✨ اكتمل تحليل الأوقات.")
            return response.text
        except Exception as e:
            self._handle_error("تحليل الأوقات", e)
            return None

    def analyze_error_patterns(self):
        print("\n🔍 [2/3] جاري تحليل أنماط الأخطاء...")
        if not self.enabled: return None
        
        # فاصل زمني إلزامي لتجنب خطأ 429 في النسخة المجانية
        time.sleep(3) 
        
        try:
            failed_posts = self.db.query(models.Post).filter(models.Post.status == "failed").limit(20).all()
            if not failed_posts:
                print("ℹ️ لا توجد سجلات أخطاء لتحليلها.")
                return "لا توجد أخطاء."

            errors = [str(getattr(p, 'error_message', getattr(p, 'status', 'Error'))) for p in failed_posts]
            error_summary = "\n".join(set(errors))
            
            prompt = f"حلل هذه الأخطاء التقنية واقترح حلاً مختصراً بالعربية: {error_summary}"
            response = self.model.generate_content(prompt)
            
            self._save_insight(content=response.text, cat="warning")
            print("✨ اكتمل تحليل الأخطاء.")
            return response.text
        except Exception as e:
            self._handle_error("تحليل الأنماط", e)
            return None

    def suggest_group_strategy(self):
        print("\n🔍 [3/3] جاري تحليل استراتيجية المجموعات...")
        if not self.enabled: return None
        
        # فاصل زمني إضافي للأمان
        time.sleep(5) 
        
        try:
            groups = self.db.query(models.Group).limit(15).all()
            names = [g.name for g in groups]
            
            prompt = f"اقترح استراتيجية محتوى ذكية لهذه المجموعات: {', '.join(names)}"
            response = self.model.generate_content(prompt)
            
            self._save_insight(content=response.text, cat="suggestion")
            print("✨ اكتمل تحليل الاستراتيجية.")
            return response.text
        except Exception as e:
            self._handle_error("تحليل المجموعات", e)
            return None

    def generate_comment(self, context: str = ""):
        print(f"📝 جاري توليد محتوى لـ: {context[:30]}...")
        if not self.enabled: return None
        try:
            prompt = f"اكتب منشور أو تعليق فيسبوك تفاعلي وقصير جداً لسياق: {context}"
            response = self.model.generate_content(prompt)
            print("✅ تم توليد المحتوى بنجاح.")
            return response.text.strip()
        except Exception as e:
            self._handle_error("توليد التعليق", e)
            return None

    def _save_insight(self, content, cat):
        """حفظ متوافق مع الحقول: insight و category في models.py"""
        try:
            new_insight = models.AIInsight(
                insight=content,   # الحقل النصي في جدولك
                category=cat       # حقل التصنيف في جدولك
            )
            self.db.add(new_insight)
            self.db.commit()
            print(f"💾 تم حفظ الرؤية في الداتابيز (الفئة: {cat})")
        except Exception as e:
            self.db.rollback()
            print(f"❌ فشل حفظ البيانات: {e}")

    def _handle_error(self, operation, error):
        """نظام تنبيهات Quota مخصص لك يا أسامة"""
        error_msg = str(error)
        if "429" in error_msg or "quota" in error_msg.lower():
            print(f"🛑 تنبيه [Quota]: تم تجاوز حد الطلبات المجانية أثناء {operation}.")
            print("💡 يرجى الانتظار دقيقة واحدة قبل محاولة التحليل مجدداً.")
        else:
            print(f"❌ خطأ في {operation}: {error_msg}")

    def __del__(self):
        if hasattr(self, 'db'): self.db.close()

# تصدير النسخة الجاهزة
ai_engine = AIEngine()