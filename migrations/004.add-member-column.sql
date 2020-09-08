DROP VIEW registered_users;
DROP VIEW unregistered_users;

ALTER TABLE users
ADD COLUMN member BOOLEAN NOT NULL DEFAULT FALSE;

CREATE VIEW registered_users AS
SELECT *
FROM users
WHERE users.password IS NOT NULL;

CREATE VIEW unregistered_users AS
SELECT *
FROM users
WHERE users.password IS NULL;