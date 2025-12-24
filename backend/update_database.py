"""
سكريبت لتحديث جدول groups - جعل url اختياري
تشغيل: python update_database.py
"""

import sys
sys.path.append('.')

from app.database import engine
from sqlalchemy import text

def update_database():
    """تحديث جدول groups لجعل url اختياري"""
    
    print("🔧 تحديث قاعدة البيانات...")
    
    try:
        with engine.connect() as conn:
            # تحديث العمود url ليصبح اختياري (nullable)
            conn.execute(text("""
                -- SQLite
                PRAGMA foreign_keys=off;
                
                BEGIN TRANSACTION;
                
                -- إنشاء جدول مؤقت
                CREATE TABLE groups_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR NOT NULL,
                    url VARCHAR,  -- اختياري الآن
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- نسخ البيانات
                INSERT INTO groups_new (id, name, url, is_active, created_at, updated_at)
                SELECT id, name, url, is_active, created_at, updated_at
                FROM groups;
                
                -- حذف الجدول القديم
                DROP TABLE groups;
                
                -- إعادة تسمية الجدول الجديد
                ALTER TABLE groups_new RENAME TO groups;
                
                COMMIT;
                
                PRAGMA foreign_keys=on;
            """))
            
            conn.commit()
            
        print("✅ تم تحديث قاعدة البيانات بنجاح!")
        print("📊 الآن url أصبح اختياري")
        
    except Exception as e:
        print(f"❌ خطأ في التحديث: {e}")
        print("\n💡 جرب الطريقة اليدوية:")
        print("1. احذف ملف facebook_bot.db")
        print("2. شغّل Backend من جديد")
        print("3. سيُنشئ database جديد بالإعدادات الصحيحة")

if __name__ == "__main__":
    print("⚠️  تأكد من إيقاف Backend قبل التشغيل!\n")
    input("اضغط Enter للمتابعة...")
    
    update_database()
    
    print("\n✅ تم!")
    input("اضغط Enter للخروج...")
