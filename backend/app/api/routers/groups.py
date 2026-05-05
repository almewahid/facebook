from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import pandas as pd

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    """إنشاء مجموعة جديدة مع دعم التصنيفات"""
    existing = db.query(models.Group).filter(models.Group.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="المجموعة موجودة بالفعل")

    group_data = group.model_dump()
    db_group = models.Group(**group_data)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.get("", response_model=List[schemas.GroupResponse])
def get_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """الحصول على كل المجموعات"""
    groups = db.query(models.Group).order_by(models.Group.id.desc()).offset(skip).limit(limit).all()
    return groups


@router.get("/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    """الحصول على مجموعة محددة"""
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    return group


@router.put("/{group_id}", response_model=schemas.GroupResponse)
def update_group(group_id: int, group_update: schemas.GroupUpdate, db: Session = Depends(get_db)):
    """تحديث بيانات المجموعة (الاسم، الرابط، أو القائمة)"""
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")

    update_data = group_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_group, key, value)

    db.commit()
    db.refresh(db_group)
    return db_group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    """حذف مجموعة"""
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")

    db.delete(db_group)
    db.commit()
    return None


@router.post("/import/csv", response_model=dict)
async def import_groups_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة CSV")

    try:
        contents = await file.read()
        decoded = contents.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(decoded))

        added_count = 0
        skipped_count = 0
        errors = []

        for row_num, row in enumerate(csv_reader, start=2):
            try:
                name = row.get('name', '').strip()
                url = row.get('url', '').strip() or None
                is_active = row.get('is_active', 'true').lower() == 'true'
                category = row.get('category', 'عام').strip() or 'عام'

                if not name:
                    errors.append(f"السطر {row_num}: اسم المجموعة فارغ")
                    continue

                existing = db.query(models.Group).filter(models.Group.name == name).first()
                if existing:
                    skipped_count += 1
                    continue

                new_group = models.Group(name=name, url=url, is_active=is_active, category=category)
                db.add(new_group)
                added_count += 1

            except Exception as e:
                errors.append(f"السطر {row_num}: {str(e)}")

        db.commit()
        return {
            "success": True,
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors,
            "total": added_count + skipped_count
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في معالجة الملف: {str(e)}")


@router.post("/import/excel", response_model=dict)
async def import_groups_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        if 'name' not in df.columns:
            raise HTTPException(400, "العمود 'name' مطلوب في ملف Excel")

        added_count = 0
        skipped_count = 0
        errors = []

        for index, row in df.iterrows():
            try:
                name = str(row.get('name', '')).strip()
                url = str(row.get('url', '')).strip() if pd.notna(row.get('url')) else None
                is_active = bool(row.get('is_active', True))
                category = str(row.get('category', 'عام')).strip() if pd.notna(row.get('category', 'عام')) else 'عام'

                if not name or name == 'nan':
                    errors.append(f"السطر {index + 2}: اسم المجموعة فارغ")
                    continue

                existing = db.query(models.Group).filter(models.Group.name == name).first()
                if existing:
                    skipped_count += 1
                    continue

                new_group = models.Group(
                    name=name,
                    url=url if url and url != 'nan' else None,
                    is_active=is_active,
                    category=category if category and category != 'nan' else 'عام'
                )
                db.add(new_group)
                added_count += 1

            except Exception as e:
                errors.append(f"السطر {index + 2}: {str(e)}")

        db.commit()
        return {
            "success": True,
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors,
            "total": added_count + skipped_count
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في معالجة الملف: {str(e)}")


@router.post("/import/bulk", response_model=dict)
async def import_groups_bulk(
    data: schemas.GroupBulkImport,
    db: Session = Depends(get_db)
):
    added_count = 0
    skipped_count = 0
    errors = []

    for idx, group_data in enumerate(data.groups):
        try:
            existing = db.query(models.Group).filter(models.Group.name == group_data.name).first()
            if existing:
                skipped_count += 1
                continue

            new_group = models.Group(
                name=group_data.name,
                url=group_data.url,
                is_active=group_data.is_active,
                category=group_data.category or "عام"
            )
            db.add(new_group)
            added_count += 1

        except Exception as e:
            errors.append(f"المجموعة {idx + 1}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في حفظ البيانات: {str(e)}")

    return {
        "success": True,
        "added": added_count,
        "skipped": skipped_count,
        "errors": errors,
        "total": added_count + skipped_count
    }
