CREATE TABLE user_requests (
    email VARCHAR(255) NOT NULL,
    firstname VARCHAR(15) NOT NULL,
    lastname VARCHAR(15) NOT NULL,
    bde_uuid VARCHAR(36) NOT NULL,
    specialty_name VARCHAR(6) NOT NULL,
    specialty_year INTEGER NOT NULL,

    CONSTRAINT PK_UserRequests PRIMARY KEY (email),
    CONSTRAINT FK_UserRequests_Bde FOREIGN KEY (bde_uuid) REFERENCES bde(bde_uuid),
    CONSTRAINT FK_UserRequests_Specialties FOREIGN KEY (specialty_name, bde_uuid) REFERENCES specialties(specialty_name, bde_uuid)
)