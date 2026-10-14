-- users and employee tables (the schema comes from yoyo's search_path: DB_SCHEMA)
-- IF NOT EXISTS leaves the tables untouched when they already exist

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL    NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOL         DEFAULT TRUE NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at    TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS employee (
    id          SERIAL4        NOT NULL,
    first_name  VARCHAR(100)   NOT NULL,
    last_name   VARCHAR(100)   NOT NULL,
    email       VARCHAR(150)   NOT NULL,
    mobile      VARCHAR(15)    NOT NULL,
    department  VARCHAR(100)   NOT NULL,
    designation VARCHAR(100)   NOT NULL,
    salary      NUMERIC(10, 2) NOT NULL,
    status      BOOL           DEFAULT TRUE NULL,
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT employee_email_key UNIQUE (email),
    CONSTRAINT employee_mobile_key UNIQUE (mobile),
    CONSTRAINT employee_pkey PRIMARY KEY (id)
);
