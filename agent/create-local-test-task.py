import os
import sys


def ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value or default


def main():
    project_backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
    if project_backend not in sys.path:
        sys.path.insert(0, project_backend)

    os.environ.setdefault("DATABASE_URL", "sqlite:///./facebook_bot_test.db")
    os.environ.setdefault("SECRET_KEY", "local-test-secret")

    from app.database import Base, SessionLocal, engine
    from app.models import Group, PublishPost, User
    from app.security import hash_password

    Base.metadata.create_all(bind=engine)

    print("")
    print("Create local publishing test task")
    print("===============================")
    group_url = ask("Paste a Facebook group URL for testing")
    if not group_url:
        print("Group URL is required.")
        return

    text = ask("Post text", "تجربة نشر من منصة النشر")

    db = SessionLocal()
    try:
        user = db.query(User).order_by(User.id.asc()).first()
        if user is None:
            user = User(
                email="local-agent@example.com",
                full_name="Local Agent Test",
                password_hash=hash_password("local-agent-password"),
                role="admin",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        group = db.query(Group).filter(
            Group.user_id == user.id,
            Group.url == group_url,
        ).first()
        if group is None:
            group = Group(
                user_id=user.id,
                name="مجموعة تجربة",
                category="تجربة",
                url=group_url,
                is_active=True,
            )
            db.add(group)
            db.commit()
            db.refresh(group)

        task = PublishPost(
            user_id=user.id,
            text=text,
            publish_method="new_post",
            status="pending",
            total_groups=1,
            target_group_ids=str(group.id),
            delay_minutes=1,
            delay_max_minutes=1,
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        print("")
        print("Test task created.")
        print(f"  user_id: {user.id}")
        print(f"  group_id: {group.id}")
        print(f"  post_id: {task.id}")
        print("")
        print("Now run agent\\run-agent-local.bat and choose 2.")
        print("")
    finally:
        db.close()


if __name__ == "__main__":
    main()
