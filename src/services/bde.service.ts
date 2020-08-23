import { BDEService, BDE, BDEServiceError, BDEErrorType, UnregisteredUser } from '@bde-polytech-mtp/base-backend';
import { Pool } from 'pg'; 
import { transaction } from '../db-utils';

type BDERow = { bde_uuid: string, bde_name: string, specialty_name: string, min_year: number, max_year: number };

export class PostgresBDEService implements BDEService {

    constructor(private db: Pool) {}
    
    async create(bde: BDE, owner: UnregisteredUser): Promise<BDE> {
        try {
            await transaction(this.db, async (client) => {
                /* Create BDE */
                await client.query('INSERT INTO bde (bde_uuid, bde_name) VALUES ($1, $2)', [bde.bdeUUID, bde.bdeName]);
                /* Add specialties */
                const promises = bde.specialties.map(
                    spe => client.query(
                        'INSERT INTO specialties (specialty_name, bde_uuid, min_year, max_year) VALUES ($1, $2, $3, $4)',
                        [spe.name, bde.bdeUUID, spe.minYear, spe.maxYear]
                    )
                );
                await Promise.all(promises);
                /* Create owner account */
                await client.query(
                    'INSERT INTO users (user_uuid, email, bde_uuid, firstname, lastname, permissions) VALUES ($1, $2, $3, $4, $5, $6)',
                    [owner.userUUID, owner.email, owner.bdeUUID, owner.firstname, owner.lastname, owner.permissions.map(p => p.name)]
                );
            });
            return bde;
        } catch (e) {
            switch(e.constraint) {
                case 'pk_bde':
                    throw new BDEServiceError('A BDE with the given UUID already exists.', BDEErrorType.BDE_ALREADY_EXISTS);
                case 'unique_name':
                    throw new BDEServiceError('A BDE with the given name already exists', BDEErrorType.BDE_ALREADY_EXISTS);
                case 'unique_users_email':
                    throw new BDEServiceError('An user with the given email already exists.', BDEErrorType.USER_ALREADY_EXISTS);
                case 'pk_users':
                    throw new BDEServiceError('An user with the given UUID already exists', BDEErrorType.USER_ALREADY_EXISTS);
                default:
                    throw new BDEServiceError(`Unable to create a BDE.\n${e}`, BDEErrorType.INTERNAL);
            }
        }
    }

    delete(uuid: string): Promise<BDE> {
        throw new Error("Method not implemented.");
    }

    async listAll(): Promise<BDE[]> {
        try {
            let {rows}: { rows: BDERow[] } = await this.db.query(
                `SELECT bde_uuid,
                        bde_name,
                        specialty_name,
                        min_year,
                        max_year
                 FROM bde 
                 NATURAL JOIN specialties`
            );
            const bdes: {[key: string]: BDE} = {};
            rows.forEach((row) => {
                if (!bdes[row.bde_uuid]) {
                    bdes[row.bde_uuid] = {
                        bdeName: row.bde_name,
                        bdeUUID: row.bde_uuid,
                        specialties: [],
                    };
                }
                bdes[row.bde_uuid].specialties.push({
                    name: row.specialty_name,
                    minYear: row.min_year,
                    maxYear: row.max_year,
                });
            });
            return Object.values(bdes);
        } catch (e) {
            throw new BDEServiceError(`Unable to fetch all BDEs.\n${e}`, BDEErrorType.INTERNAL);
        }
    }

    async findByUUID(uuid: string): Promise<BDE> {
        try {
            const { rows }: { rows: BDERow[] } = await this.db.query(
                `SELECT bde_uuid, 
                        bde_name, 
                        specialty_name, 
                        min_year, 
                        max_year 
                 FROM bde 
                 NATURAL JOIN specialties 
                 WHERE bde.bde_uuid=$1`,
                [uuid]
            );
            if (rows.length >= 1) {
                const row = rows[0];
                let bde: BDE = {
                    bdeName: row.bde_name,
                    bdeUUID: row.bde_uuid,
                    specialties: [],
                };
                rows.forEach((row) => bde.specialties.push({ name: row.specialty_name, minYear: row.min_year, maxYear: row.max_year }));
                return bde;
            }
            throw new BDEServiceError('No BDE with the given UUID exists.', BDEErrorType.BDE_NOT_EXISTS);
        } catch (e) {
            throw new BDEServiceError(`Unable to fetch BDE.\n${e}`, BDEErrorType.INTERNAL);
        }
    }

}