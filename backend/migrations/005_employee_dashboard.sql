-- Employee dashboard: attendance, leave and policy tables
-- depends: 004_auth_login

-- attendance may predate this migration (one status row per employee per day);
-- 006 adds the check-in/check-out columns in either case
CREATE TABLE IF NOT EXISTS attendance (
    id          SERIAL4      NOT NULL,
    employee_id INT4         NOT NULL,
    date        DATE         NOT NULL,
    status      VARCHAR(20)  NOT NULL,
    remarks     VARCHAR(255) NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT attendance_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_employee_id_date_key UNIQUE (employee_id, date),
    CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employee (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_type (
    id            SERIAL4     NOT NULL,
    name          VARCHAR(50) NOT NULL,
    days_per_year INT4        NOT NULL,
    CONSTRAINT leave_type_pkey PRIMARY KEY (id),
    CONSTRAINT leave_type_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS leave_request (
    id            BIGSERIAL    NOT NULL,
    employee_id   INT4         NOT NULL,
    leave_type_id INT4         NOT NULL,
    start_date    DATE         NOT NULL,
    end_date      DATE         NOT NULL,
    days          INT4         NOT NULL,
    reason        VARCHAR(500) NOT NULL,
    status        VARCHAR(20)  DEFAULT 'pending' NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at    TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    CONSTRAINT leave_request_pkey PRIMARY KEY (id),
    CONSTRAINT leave_request_employee_fkey FOREIGN KEY (employee_id) REFERENCES employee (id) ON DELETE CASCADE,
    CONSTRAINT leave_request_type_fkey FOREIGN KEY (leave_type_id) REFERENCES leave_type (id),
    CONSTRAINT leave_request_dates_check CHECK (end_date >= start_date),
    CONSTRAINT leave_request_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS leave_request_employee_idx ON leave_request (employee_id, start_date);

-- department NULL = company-wide policy, otherwise it matches employee.department
CREATE TABLE IF NOT EXISTS policy (
    id             SERIAL4      NOT NULL,
    title          VARCHAR(150) NOT NULL,
    category       VARCHAR(50)  NOT NULL,
    department     VARCHAR(100) NULL,
    summary        VARCHAR(300) NOT NULL,
    content        TEXT         NOT NULL,
    effective_from DATE         DEFAULT CURRENT_DATE NOT NULL,
    is_active      BOOL         DEFAULT TRUE NOT NULL,
    created_at     TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    CONSTRAINT policy_pkey PRIMARY KEY (id)
);

INSERT INTO leave_type (name, days_per_year) VALUES
    ('Casual Leave', 12),
    ('Sick Leave', 10),
    ('Earned Leave', 15)
ON CONFLICT (name) DO NOTHING;

-- Starter policies (sample text: edit or replace with the real company policies)
INSERT INTO policy (title, category, department, summary, content)
SELECT * FROM (VALUES
    ('Attendance Policy', 'Attendance', NULL,
     'Working hours, check-in and check-out rules.',
     E'Working days are Monday to Friday.\nMark check-in when you start work and check-out when you finish, every working day.\nLess than 4 working hours in a day is counted as a half day.\nA working day with no check-in and no approved leave is counted as absent.'),
    ('Leave Policy', 'Leave', NULL,
     'Leave types, yearly allowance and how to apply.',
     E'Each employee gets 12 Casual, 10 Sick and 15 Earned leaves per calendar year.\nApply from the Leave page before the leave starts.\nWeekly offs inside a leave period are not counted as leave days.\nA pending request can be cancelled any time before it is approved.'),
    ('Code of Conduct', 'General', NULL,
     'Expected behaviour at the workplace.',
     E'Treat colleagues, customers and partners with respect.\nKeep company and customer information confidential.\nReport any harassment or misconduct to Human Resources.'),
    ('IT Security Policy', 'Security', 'IT',
     'Access, credentials and code handling for the IT team.',
     E'Never share credentials or commit secrets to a repository.\nProduction access is granted on a need basis and reviewed every quarter.\nAll code changes go through review before release.'),
    ('Sales Travel & Expense Policy', 'Expense', 'Sales',
     'Travel bookings and expense claims for the Sales team.',
     E'Client travel must be approved by the reporting manager before booking.\nSubmit expense claims with bills within 15 days of the trip.'),
    ('Payment Approval Policy', 'Finance', 'Finance',
     'Approval limits for payments and vendor invoices.',
     E'Every vendor payment needs a matching invoice and purchase order.\nPayments above the department limit need a second approver.')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM policy);
