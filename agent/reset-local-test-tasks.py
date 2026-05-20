import os
import sys


def main():
    project_backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
    if project_backend not in sys.path:
        sys.path.insert(0, project_backend)

    os.environ.setdefault("DATABASE_URL", "sqlite:///./facebook_bot_test.db")
    os.environ.setdefault("SECRET_KEY", "local-test-secret")

    from app.database import SessionLocal
    from app.models import PublishPost

    db = SessionLocal()
    try:
        tasks = db.query(PublishPost).filter(PublishPost.status.in_(["pending", "publishing", "done", "failed"])).all()
        for task in tasks:
            task.status = "pending"
            task.success_count = 0
            task.failed_count = 0
            task.published_at = None
        db.commit()
        print(f"Reset tasks: {len(tasks)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
