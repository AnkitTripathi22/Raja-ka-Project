import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_SCHEMA = os.getenv("DB_SCHEMA", "public")

engine = create_engine(
    URL.create(
        "postgresql+psycopg2",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
    ),
    # The users and employee tables live in this schema
    connect_args={"options": f"-csearch_path={DB_SCHEMA}"},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def yoyo_database_url() -> str:
    # yoyo's "schema" option sets the search_path
    return (
        f"postgresql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}?schema={DB_SCHEMA}"
    )
