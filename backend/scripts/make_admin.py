"""Give an existing login the admin role (or take it away).

    python -m scripts.make_admin you@company.com
    python -m scripts.make_admin you@company.com employee
"""
import sys

from src.database import get_db
from src.repositories import user_repository as repo


def main():
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] not in ("admin", "employee")):
        print("Usage: python -m scripts.make_admin <email> [admin|employee]")
        sys.exit(1)
    email = sys.argv[1].strip()
    role = sys.argv[2] if len(sys.argv) == 3 else "admin"

    db = next(get_db())
    try:
        if not repo.set_role(db, email, role):
            print(f"No account found for {email}; register it first")
            sys.exit(1)
        db.commit()
        print(f"{email} is now: {role}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
