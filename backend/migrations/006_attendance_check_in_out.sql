-- Check-in/check-out times on attendance; rows created before this have no times
-- depends: 005_employee_dashboard

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ NULL;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ NULL;
