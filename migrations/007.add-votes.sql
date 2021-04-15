CREATE TABLE votes (
    user_uuid VARCHAR(36) NOT NULL,
    liste VARCHAR(255),
    voted_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Votes_Users FOREIGN KEY (user_uuid) REFERENCES users(user_uuid),
    CONSTRAINT PK_Votes PRIMARY KEY (user_uuid, voted_on)
)