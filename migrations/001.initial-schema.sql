CREATE TABLE bde (
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(30) NOT NULL,

    CONSTRAINT PK_Bde PRIMARY KEY (uuid),
    CONSTRAINT Unique_name UNIQUE (name)
);

CREATE TABLE specialties (
    name VARCHAR(6) NOT NULL,
    bde_uuid VARCHAR(36) NOT NULL,
    min_year INTEGER NOT NULL,
    max_year INTEGER NOT NULL,

    CONSTRAINT PK_Specialies PRIMARY KEY (name, bde_uuid),
    CONSTRAINT FK_Specialties_Bde FOREIGN KEY (bde_uuid) REFERENCES bde(uuid),
    CONSTRAINT min_lt_max CHECK (min_year <= max_year)
);

CREATE TABLE users (
    uuid VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    firstname VARCHAR(15) DEFAULT NULL,
    lastname VARCHAR(15) DEFAULT NULL,
    password VARCHAR(255) DEFAULT NULL,
    bde_uuid VARCHAR(36) NOT NULL,
    specialty_name VARCHAR(6) DEFAULT NULL,
    specialty_year INTEGER DEFAULT NULL,
    permissions VARCHAR(50)[] NOT NULL,

    CONSTRAINT PK_Users PRIMARY KEY (uuid),
    CONSTRAINT FK_Users_Bde FOREIGN KEY (bde_uuid) REFERENCES bde(uuid),
    CONSTRAINT UNIQUE_Users_email UNIQUE (email),
    CONSTRAINT FK_Users_Specialties FOREIGN KEY (specialty_name, bde_uuid) REFERENCES specialties(name, bde_uuid)
);

CREATE TABLE events (
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    booking_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    booking_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    event_state INTEGER NOT NULL,
    bde_uuid VARCHAR(36) NOT NULL,
    is_draft BOOLEAN NOT NULL,

    CONSTRAINT PK_Events PRIMARY KEY (uuid),
    CONSTRAINT FK_Events_Bde FOREIGN KEY (bde_uuid) REFERENCES bde(uuid)
);

CREATE TABLE booking (
    user_uuid VARCHAR(36),
    event_uuid VARCHAR(36),

    CONSTRAINT PK_Booking PRIMARY KEY (user_uuid, event_uuid),
    CONSTRAINT FK_Booking_Users FOREIGN KEY (user_uuid) REFERENCES users(uuid),
    CONSTRAINT FK_Booking_Events FOREIGN KEY (event_uuid) REFERENCES events(uuid)
);

CREATE VIEW registered_users AS
SELECT *
FROM users
WHERE users.password IS NOT NULL;

CREATE VIEW unregistered_users AS
SELECT *
FROM users
WHERE users.password IS NULL;
