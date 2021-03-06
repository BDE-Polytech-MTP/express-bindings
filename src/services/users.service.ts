import { UsersService, User, UnregisteredUser, UsersServiceError, UsersErrorType, permissionsFromStrings } from '@bde-polytech-mtp/base-backend';
import { UserRequest } from '@bde-polytech-mtp/base-backend/dist/models/user-request.model';
import { Pool, QueryResult } from 'pg';
import { transaction } from '../db-utils';
import { v4 as uuid } from 'uuid';

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

interface UserRequestRow {
    email: string;
    firstname: string;
    lastname: string;
    bde_uuid: string;
    specialty_name: string;
    specialty_year: number;
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

    private mapUserRequestRowToUserRequest(row: UserRequestRow): UserRequest {
        return {
            bdeUUID: row.bde_uuid,
            email: row.email,
            firstname: row.firstname,
            lastname: row.lastname,
            specialtyName: row.specialty_name,
            specialtyYear: row.specialty_year,
        };
    }

    async findAllRequest(bdeUUID: string): Promise<UserRequest[]> {
        try {
            const { rows }: { rows: UserRequestRow[] } = await this.db.query('SELECT * FROM user_requests WHERE bde_uuid = $1 AND refused=false', [bdeUUID])
            return rows.map(row => this.mapUserRequestRowToUserRequest(row));
        } catch (e) {
            console.error(e);
            throw new UsersServiceError(`Unable to fetch user requests.\n${e}.`, UsersErrorType.INTERNAL);
        }
    }

    async processUserRequest(email: string, bdeUUID: string, accepted: boolean): Promise<UnregisteredUser | null> {
        let request: UserRequest | null = null;
        try {
            const { rows }: { rows: UserRequestRow[] } = await this.db.query('SELECT * FROM user_requests WHERE email = $1 AND bde_uuid = $2 AND refused=false', [email, bdeUUID]);
            if (rows.length) {
                request = this.mapUserRequestRowToUserRequest(rows[0]);
            }
        } catch (e) {
            throw new UsersServiceError('Unable to process the request', UsersErrorType.INTERNAL);

        }
        
        if (!request) {
            throw new UsersServiceError('Unable to find the given user', UsersErrorType.USER_NOT_EXISTS);
        }

        if (accepted) {
            const unregisteredUser: UnregisteredUser = {
                ...request,
                member: false,
                permissions: [],
                userUUID: uuid(),
                email: request.email.toLowerCase(),
            };
            await transaction(this.db, async (c) =>{
                await this.create(unregisteredUser);
                await c.query('DELETE FROM user_requests WHERE email = $1', [email]);
            });
            return unregisteredUser;
        } else {
            try {
                await this.db.query('UPDATE user_requests SET refused=true WHERE email = $1', [email]);
                return null;
            } catch (e) {
                throw new UsersServiceError('Unable to refuse request', UsersErrorType.INTERNAL);
            }
        }
    }

    async register(user: UserRequest): Promise<UserRequest> {
        user = {
            ...user,
            email: user.email.toLowerCase(),
        };
        let result: QueryResult<any>;
        try {
            result = await this.db.query('SELECT COUNT(*) FROM users WHERE email=$1', [user.email]);
        } catch (e) {
            throw new UsersServiceError(`Unable to process the request.\n${e}`, UsersErrorType.INTERNAL);
        }

        if (result && result.rows && result.rows.length && result.rows[0].count !== '0') {
            throw new UsersServiceError('The given email is already used', UsersErrorType.USER_ALREADY_EXISTS);
        }

        try {
            await this.db.query(
                'INSERT INTO user_requests (email, firstname, lastname, bde_uuid, specialty_name, specialty_year) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.email, user.firstname, user.lastname, user.bdeUUID, user.specialtyName, user.specialtyYear]
            );
            return user;
        } catch (e) {
            switch (e.constraint) {
                case 'pk_userrequests':
                    throw new UsersServiceError('The given user already exists', UsersErrorType.USER_ALREADY_EXISTS);
                case 'fk_userrequests_bde':
                    throw new UsersServiceError('The given bde UUID is invalid', UsersErrorType.BDE_NOT_EXISTS);
                case 'fk_userrequests_specialties':
                    throw new UsersServiceError('The given specialty do not exists', UsersErrorType.INVALID_SPECIALTY);
                default:
                    console.error(e);
                    throw new UsersServiceError(`Unable to process the request.\n${e}`, UsersErrorType.INTERNAL);
            }
        }
    }

    async create(user: UnregisteredUser): Promise<UnregisteredUser> {
        try {
            await this.db.query(
                'INSERT INTO users (user_uuid, email, bde_uuid, firstname, lastname, permissions, member) VALUES ($1, $2, $3, $4, $5, $6, $7)',
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

    async findByUUID(uuid: string): Promise<User | UnregisteredUser> {
        try {
            const { rows }: { rows: UserRow[] } = await this.db.query('SELECT * FROM users WHERE user_uuid = $1', [uuid]);
            if (rows.length === 1) {
                let row = rows[0];
                return this.mapUserRowToUser(row);
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