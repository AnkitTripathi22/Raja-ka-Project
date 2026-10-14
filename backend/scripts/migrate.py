"""Run yoyo migrations using the database settings from .env.

    python -m scripts.migrate            # apply pending migrations
    python -m scripts.migrate rollback   # roll back the last migration
"""
import sys
from pathlib import Path

from sqlalchemy import text
from yoyo import get_backend, read_migrations

from src.database import DB_SCHEMA, engine, yoyo_database_url

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "apply"
    if action not in ("apply", "rollback"):
        print("Usage: python -m scripts.migrate [apply|rollback]")
        sys.exit(1)

    # yoyo creates its own tables in this schema too, so the schema must exist first
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"'))

    backend = get_backend(yoyo_database_url())
    migrations = read_migrations(str(MIGRATIONS_DIR))

    with backend.lock():
        if action == "apply":
            todo = backend.to_apply(migrations)
            backend.apply_migrations(todo)
        else:
            todo = backend.to_rollback(migrations)[:1]
            backend.rollback_migrations(todo)

    if not todo:
        print("Nothing to do")
    for m in todo:
        print(f"{action}: {m.id}")


if __name__ == "__main__":
    main()
