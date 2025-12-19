"""
محرك الذكاء الاصطناعي باستخدام Claude API
"""

import os
from anthropic import Anthropic
from datetime import datetime
from app.database import SessionLocal
from app import models

class AIEngine:
    """محرك الذكاء الاصطناعي"""
    
    def __init__(self):
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if api_key:
            self.client = Anthropic(api_key=api_key)
            self.enabled = True
        else:
            print("⚠️ ANTHROPIC_API_KEY غير موجود - الذكاء الاصطناعي معطل")
            self.enabled = False
        
        self.db = SessionLocal()
    
    def analyze_best_posting_times(self):
        """تحليل أفضل أوقات النشر"""
        if not self.enabled:
            return None
        
        try:
            # جلب البيانات من قاعدة البيانات
            posts = self.db.query(models.Post).filter(
                models.Post.status == "success"
            ).all()
            
            if len(posts) < 10:
                return "بحاجة لمزيد من البيانات (10 منشورات ناجحة على الأقل)"
            
            # تحضير البيانات
            data_summary = f"عدد المنشورات الناجحة: {len(posts)}\n"
            
            # تحليل بواسطة Claude
            message = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": f"""أنا بوت للنشر في مجموعات فيسبوك.
                        
لدي البيانات التالية:
{data_summary}

حلل البيانات واقترح:
1. أفضل أوقات النشر (الصباح، الظهر، المساء)
2. أفضل أيام الأسبوع
3. نصائح لتحسين معدل النجاح

الرجاء الإجابة بشكل مختصر ومفيد."""
                    }
                ]
            )
            
            insight_content = message.content[0].text
            
            # حفظ الرؤية
            insight = models.AIInsight(
                insight_type="best_time",
                content=insight_content,
                confidence=0.85
            )
            self.db.add(insight)
            self.db.commit()
            
            return insight_content
            
        except Exception as e:
            print(f"خطأ في تحليل الأوقات: {e}")
            return None
    
    def generate_comment(self, context: str = ""):
        """توليد تعليق ذكي"""
        if not self.enabled:
            return None
        
        try:
            message = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=100,
                messages=[
                    {
                        "role": "user",
                        "content": f"""اكتب تعليق قصير (10-15 كلمة) مناسب للنشر في مجموعة فيسبوك.
                        
السياق: {context if context else 'عام'}

التعليق يجب أن يكون:
- طبيعي وودود
- يشجع على التفاعل
- باللغة العربية
- بدون emoji كثيرة"""
                    }
                ]
            )
            
            return message.content[0].text.strip()
            
        except Exception as e:
            print(f"خطأ في توليد التعليق: {e}")
            return None
    
    def detect_error_patterns(self):
        """كشف أنماط الأخطاء"""
        if not self.enabled:
            return None
        
        try:
            # جلب الأخطاء الأخيرة
            failed_posts = self.db.query(models.Post).filter(
                models.Post.status == "failed"
            ).order_by(models.Post.created_at.desc()).limit(20).all()
            
            if len(failed_posts) < 5:
                return "لا توجد أخطاء كافية للتحليل"
            
            # تحضير ملخص الأخطاء
            error_summary = "\n".join([
                f"- {post.error_message}" for post in failed_posts if post.error_message
            ])
            
            message = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": f"""أنا بوت للنشر في فيسبوك. لدي هذه الأخطاء الأخيرة:

{error_summary}

حلل الأخطاء واقترح:
1. النمط المشترك بين الأخطاء
2. السبب المحتمل
3. الحل المقترح

كن مختصراً ومباشراً."""
                    }
                ]
            )
            
            insight_content = message.content[0].text
            
            # حفظ الرؤية
            insight = models.AIInsight(
                insight_type="error_pattern",
                content=insight_content,
                confidence=0.75
            )
            self.db.add(insight)
            self.db.commit()
            
            return insight_content
            
        except Exception as e:
            print(f"خطأ في كشف الأنماط: {e}")
            return None
    
    def suggest_group_strategy(self):
        """اقتراح استراتيجية المجموعات"""
        if not self.enabled:
            return None
        
        try:
            # جلب إحصائيات المجموعات
            groups = self.db.query(models.FacebookGroup).all()
            
            group_stats = []
            for group in groups:
                total = group.success_count + group.failure_count
                success_rate = (group.success_count / total * 100) if total > 0 else 0
                group_stats.append(f"- {group.name}: {success_rate:.1f}% نجاح ({group.success_count}/{total})")
            
            stats_text = "\n".join(group_stats)
            
            message = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": f"""أنا بوت للنشر في مجموعات فيسبوك. إحصائيات المجموعات:

{stats_text}

بناءً على هذه البيانات، اقترح:
1. المجموعات التي يجب التركيز عليها
2. المجموعات التي يجب تجنبها أو تحسينها
3. استراتيجية عامة للنشر

كن عملياً ومباشراً."""
                    }
                ]
            )
            
            insight_content = message.content[0].text
            
            # حفظ الرؤية
            insight = models.AIInsight(
                insight_type="group_recommendation",
                content=insight_content,
                confidence=0.80
            )
            self.db.add(insight)
            self.db.commit()
            
            return insight_content
            
        except Exception as e:
            print(f"خطأ في اقتراح الاستراتيجية: {e}")
            return None
    
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()

# متغير عام للمحرك
ai_engine = AIEngine()
