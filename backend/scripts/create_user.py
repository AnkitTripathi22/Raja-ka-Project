import getpass
import sys

from pydantic import ValidationError

from src.database import get_db
from src.requests.auth import RegisterRequest
from src.services import auth_service


def main():
    data = {
        "email": input("Email: "),
        "first_name": input("First name: "),
        "last_name": input("Last name: "),
        "mobile": input("Mobile: ").strip(),
        "department": input("Department: "),
        "designation": input("Designation: "),
        "salary": input("Salary: ").strip(),
        "password": getpass.getpass("Password: "),
    }

    try:
        payload = RegisterRequest(**data)
    except ValidationError as e:
        for err in e.errors():
            print(f"{err['loc'][0]}: {err['msg']}")
        sys.exit(1)

    db = next(get_db())
    try:
        result = auth_service.register(db, payload)
        print(f"User created, id = {result['user']['id']}")
    except Exception as e:
        print(getattr(e, "detail", e))
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
