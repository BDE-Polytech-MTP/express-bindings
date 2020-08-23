/* BDE */
ALTER TABLE bde
RENAME COLUMN uuid TO bde_uuid;

ALTER TABLE bde
RENAME COLUMN name TO bde_name;

/* Events */
ALTER TABLE events
RENAME COLUMN uuid TO event_uuid;

ALTER TABLE events
RENAME COLUMN name TO event_name;

ALTER TABLE events
DROP COLUMN event_state;

/* Users */
DROP VIEW registered_users;
DROP VIEW unregistered_users;

ALTER TABLE users
RENAME COLUMN uuid to user_uuid;

ALTER TABLE users
ALTER COLUMN specialty_name SET DATA TYPE VARCHAR(10);

CREATE VIEW registered_users AS
SELECT *
FROM users
WHERE users.password IS NOT NULL;

CREATE VIEW unregistered_users AS
SELECT *
FROM users
WHERE users.password IS NULL;

/* Specialties */
ALTER TABLE specialties
RENAME COLUMN name TO specialty_name;

ALTER TABLE specialties
ALTER COLUMN specialty_name SET DATA TYPE VARCHAR(10);