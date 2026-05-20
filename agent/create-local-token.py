import os
import sys


def main():
    project_backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
    if project_backend not in sys.path:
        sys.path.insert(0, project_backend)

    os.environ.setdefault("DATABASE_URL", "sqlite:///./facebook_bot_test.db")
    os.environ.setdefault("SECRET_KEY", "local-test-secret")

    from app.database import Base, SessionLocal, engine
    from app.models import User
    from app.security import create_access_token, hash_password

    Base.metadata.create_all(bind=engine)

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

        print("")
        print("Local user:")
        print(f"  id: {user.id}")
        print(f"  email: {user.email}")
        print("")
        print("Copy this token and paste it into the Agent window:")
        print(create_access_token(user.id, user.role or "user"))
        print("")
    finally:
        db.close()


if __name__ == "__main__":
    main()
