-- The seeded employees and the nullable email/mobile are kept: rows added since may rely on them
ALTER TABLE users DROP COLUMN IF EXISTS role;
