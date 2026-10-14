-- Admin panel: a role on users, and employees that the admin adds without a login
-- depends: 006_attendance_check_in_out

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'employee' NOT NULL;

-- Employees added by the admin may have no email or mobile (unique still allows many NULLs)
ALTER TABLE employee ALTER COLUMN email DROP NOT NULL;
ALTER TABLE employee ALTER COLUMN mobile DROP NOT NULL;

-- The office staff; a first name that already exists is left alone
INSERT INTO employee (first_name, last_name, department, designation, salary)
SELECT seed.first_name, '', 'Office', 'Employee', 0
FROM (VALUES
    ('Rahul'), ('Raja'), ('Pankaj'), ('Shudhanshu'), ('Ankit'), ('Sahiba'),
    ('Rajendra'), ('Bharat'), ('Amit'), ('Abhishek'), ('Shiv')
) AS seed (first_name)
WHERE NOT EXISTS (
    SELECT 1 FROM employee e WHERE LOWER(e.first_name) = LOWER(seed.first_name)
);
