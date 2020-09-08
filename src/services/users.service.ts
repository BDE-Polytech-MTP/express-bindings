import { UsersService, User, UnregisteredUser, UsersServiceError, UsersErrorType, permissionsFromStrings } from '@bde-polytech-mtp/base-backend';
import { Pool } from 'pg';

interface UserRow {
    user_uuid: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
    password: string | null;
    bde_uuid: string;
    specialty_name: string | null;
    specialty_year: number | null;
    permissions: string[];
    member: boolean;
}

export class PostgresUsersService implements UsersService {

    constructor(private db: Pool) {}

    private mapUserRowToUnregisteredUser(row: UserRow): UnregisteredUser {
        return {
            bdeUUID: row.bde_uuid,
            email: row.email,
            permissions: permissionsFromStrings(row.permissions),
            userUUID: row.user_uuid,
            firstname: row.firstname ? row.firstname : undefined,
            lastname: row.lastname ? row.lastname : undefined,
            member: row.member,
        };
    }

    private mapUserRowToRegisteredUser(row: UserRow): User {
        return {
            bdeUUID: row.bde_uuid,
            email: row.email,
            permissions: permissionsFromStrings(row.permissions),
            userUUID: row.user_uuid,
            firstname: row.firstname!,
            lastname: row.lastname!,
            password: row.password!,
            specialtyName: row.specialty_name!,
            specialtyYear: row.specialty_year!,
            member: row.member,
        };
    }

    private mapUserRowToUser(row: UserRow): User | UnregisteredUser {
        if (row.password) {
            return this.mapUserRowToRegisteredUser(row);
        }
        return this.mapUserRowToUnregisteredUser(row);
    }

    async create(user: UnregisteredUser): Promise<UnregisteredUser> {
        try {
            await this.db.query(
                'INSERT INTO users (user_uuid, email, bde_uuid, firstname, lastname, permissions, member) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.userUUID, user.email, user.bdeUUID, user.firstname, user.lastname, user.permissions.map(p => p.name), user.member]
            );
            return user;
        } catch (e) {
            switch(e.constraint) {
                case 'unique_users_email':
                    throw new UsersServiceError('The given user already exists', UsersErrorType.USER_ALREADY_EXISTS);
                case 'pk_users':
                    throw new UsersServiceError('The given uuid already exists', UsersErrorType.USER_ALREADY_EXISTS);
                case 'fk_users_bde':
                    throw new UsersServiceError('The given bde uuid does not exists', UsersErrorType.BDE_NOT_EXISTS);
                default:
                    throw new UsersServiceError(`Unable to create the user.\n${e}`, UsersErrorType.INTERNAL);
            }
        }
    }

    async finishRegistration(user: User): Promise<User> {
        await this.db.query(
            `UPDATE users 
                SET firstname = $1, lastname = $2, password = $3, specialty_name = $4, specialty_year = $5
                WHERE user_uuid = $6
            `,
            [user.firstname, user.lastname, user.password, user.specialtyName, user.specialtyYear, user.userUUID]
        );

        return user;
    }

    async findUnregisteredByUUID(uuid: string): Promise<UnregisteredUser> {
        try {
            const {rows}: { rows: UserRow[] } = await this.db.query('SELECT * FROM unregistered_users WHERE user_uuid = $1', [uuid]);
            if (rows.length === 1) {
                let row = rows[0];
                return this.mapUserRowToUnregisteredUser(row);
            }
            return Promise.reject(new UsersServiceError('No unregistered user with the given uuid found.', UsersErrorType.USER_NOT_EXISTS));
        } catch (e) {
            throw new UsersServiceError(`Unable to fetch unregistered user with the given uuid.\n${e}`, UsersErrorType.INTERNAL);
        }
    }

    async findByUUID(uuid: string): Promise<User> {
        try {
            const { rows }: { rows: UserRow[] } = await this.db.query('SELECT * FROM registered_users WHERE user_uuid = $1', [uuid]);
            if (rows.length === 1) {
                let row = rows[0];
                return this.mapUserRowToRegisteredUser(row);
            }
            return Promise.reject(new UsersServiceError('No registered user with the given uuid found.', UsersErrorType.USER_NOT_EXISTS));
        } catch (e) {
            throw new UsersServiceError(`Unable to fetch a registered user with the given uuid.\n${e}`, UsersErrorType.INTERNAL);
        }
    }

    async findByEmail(email: string): Promise<User> {
        try {
            const { rows }: { rows: UserRow[] } = await this.db.query('SELECT * FROM registered_users WHERE email = $1', [email]);
            if (rows.length === 1) {
                let row = rows[0];
                return this.mapUserRowToRegisteredUser(row);
            }
            return Promise.reject(new UsersServiceError('No registered user with the given email found.', UsersErrorType.USER_NOT_EXISTS));
        } catch (e) {
            throw new UsersServiceError(`Unable to fetch a registered user with the given email.\n${e}`, UsersErrorType.INTERNAL);
        }
    }

    async findAll(bdeUUID?: string | undefined): Promise<(User | UnregisteredUser)[]> {
        let rows: UserRow[];

        if (bdeUUID) {
            try {
                rows = (await this.db.query('SELECT * FROM users')).rows;
            } catch (e) {
                throw new UsersServiceError(`Unable to fetch all users.\n${e}`, UsersErrorType.INTERNAL);
            }
        } else {
            try {
                rows = (await this.db.query('SELECT * FROM users WHERE bde_uuid = $1', [bdeUUID])).rows;
            } catch (e) {
                throw new UsersServiceError(`Unable to fetch all users.\n${e}`, UsersErrorType.INTERNAL);
            }

            if (rows.length === 0) {
                throw new UsersServiceError(`BDE ${bdeUUID} does no exist.`, UsersErrorType.BDE_NOT_EXISTS);
            }
        }

        return rows.map(this.mapUserRowToUser.bind(this));
    }

    delete(uuid: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}