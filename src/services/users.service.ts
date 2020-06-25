import { UsersService, User, UnregisteredUser, UsersServiceError, UsersErrorType } from 'generic-backend';
import { Pool } from 'pg';

export class PostgresUsersService implements UsersService {

    constructor(private db: Pool) {}

    async create(user: UnregisteredUser): Promise<UnregisteredUser> {
        try {
            await this.db.query(
                'INSERT INTO users (uuid, email, bde_uuid, firstname, lastname) VALUES ($1, $2, $3, $4, $5)',
                [user.uuid, user.email, user.bdeUUID, user.firstname, user.lastname]
            );
            return user;
        } catch (e) {
            if (e.constraint === 'unique_users_email') {
                throw new UsersServiceError('The given user already exists', UsersErrorType.USER_ALREADY_EXISTS);
            } else if (e.constraint === 'pk_users') {
                throw new UsersServiceError('The given uuid already exists', UsersErrorType.USER_ALREADY_EXISTS);
            } else if (e.constraint === 'fk_users_bde') {
                throw new UsersServiceError('The given bde uuid does not exists', UsersErrorType.BDE_NOT_EXISTS);
            } else {
                throw new UsersServiceError('Unable to create the user.', UsersErrorType.INTERNAL);
            }
        }
    }

    async finishRegistration(user: User): Promise<User> {
        await this.db.query(
            `UPDATE users 
             SET firstname = $1, lastname = $2, password = $3, specialty = $4
             WHERE uuid = $5
            `,
            [user.firstname, user.lastname, user.password, user.specialty, user.uuid]
        );

        return user;
    }

    async findUnregisteredByUUID(uuid: string): Promise<UnregisteredUser> {
        try {
            const {rows} = await this.db.query('SELECT * FROM unregistered_users WHERE uuid = $1', [uuid]);
            if (rows.length === 1) {
                let row = rows[0];
                return {
                    uuid: row.uuid,
                    bdeUUID: row.bde_uuid,
                    email: row.email,
                    firstname: row.firstname,
                    lastname: row.lastname,
                };
            }
            return Promise.reject(new UsersServiceError('No unregistered user with the given uuid found.', UsersErrorType.USER_NOT_EXISTS));
        } catch (_) {
            throw new UsersServiceError('Unable to fetch unregistered user with the given uuid.', UsersErrorType.INTERNAL);
        }
    }

    async findByUUID(uuid: string): Promise<User> {
        try {
            const { rows } = await this.db.query('SELECT * FROM registered_users WHERE uuid = $1', [uuid]);
            if (rows.length === 1) {
                let row = rows[0];
                return {
                    uuid: row.uuid,
                    bdeUUID: row.bde_uuid,
                    email: row.email,
                    firstname: row.fistname,
                    lastname: row.lastname,
                    password: row.password,
                    specialty: row.specialty,
                };
            }
            return Promise.reject(new UsersServiceError('No registered user with the given uuid found.', UsersErrorType.USER_NOT_EXISTS));
        } catch (_) {
            throw new UsersServiceError('Unable to fetch a registered user with the given uuid.', UsersErrorType.INTERNAL);
        }
    }

    async findByEmail(email: string): Promise<User> {
        try {
            const { rows } = await this.db.query('SELECT * FROM registered_users WHERE email = $1', [email]);
            if (rows.length === 1) {
                let row = rows[0];
                return {
                    uuid: row.uuid,
                    bdeUUID: row.bde_uuid,
                    email: row.email,
                    firstname: row.fistname,
                    lastname: row.lastname,
                    password: row.password,
                    specialty: row.specialty,
                };
            }
            return Promise.reject(new UsersServiceError('No registered user with the given email found.', UsersErrorType.USER_NOT_EXISTS));
        } catch (_) {
            throw new UsersServiceError('Unable to fetch a registered user with the given email.', UsersErrorType.INTERNAL);
        }
    }

    delete(uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}