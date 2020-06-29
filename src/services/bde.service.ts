import { BDEService, BDE, BDEServiceError, BDEErrorType } from 'generic-backend';
import { Pool } from 'pg'; 
import { transaction } from '../db-utils';

export class PostgresBDEService implements BDEService {

    constructor(private db: Pool) {}
    
    async create(bde: BDE): Promise<BDE> {
        try {
            await transaction(this.db, async (client) => {
                await client.query('INSERT INTO bde (uuid, name) VALUES ($1, $2)', [bde.uuid, bde.name]);
                const promises = bde.specialties.map(
                    spe => client.query(
                        'INSERT INTO specialties (name, bde_uuid, min_year, max_year) VALUES ($1, $2, $3, $4)',
                        [spe.name, bde.uuid, spe.minYear, spe.maxYear]
                    )
                );
                await Promise.all(promises);
            })
            return bde;
        } catch (e) {
            if (e.constraint === 'pk_bde') {
                throw new BDEServiceError('A BDE with the given UUID already exists.', BDEErrorType.BDE_ALREADY_EXISTS);
            } else  if (e.constraint === 'unique_name') {
                throw new BDEServiceError('A BDE with the given name already exists', BDEErrorType.BDE_ALREADY_EXISTS);
            }
            throw new BDEServiceError('Unable to create a BDE.', BDEErrorType.INTERNAL);
        }
    }

    delete(uuid: string): Promise<BDE> {
        throw new Error("Method not implemented.");
    }

    async listAll(): Promise<BDE[]> {
        try {
            let {rows} = await this.db.query(
                'SELECT bde.uuid, bde.name, spe.name as spe_name, spe.min_year, spe.max_year FROM bde JOIN specialties as spe ON bde_uuid = uuid'
            );
            const bdes: {[key: string]: BDE} = {};
            rows.forEach((row) => {
                if (!bdes[row.uuid]) {
                    bdes[row.uuid] = {
                        name: row.name,
                        uuid: row.uuid,
                        specialties: [],
                    };
                }
                bdes[row.uuid].specialties.push({
                    name: row.spe_name,
                    minYear: row.min_year,
                    maxYear: row.max_year,
                });
            });
            return Object.values(bdes);
        } catch (e) {
            throw new BDEServiceError('Unable to fetch all BDEs', BDEErrorType.INTERNAL);
        }
    }

    async findByUUID(uuid: string): Promise<BDE> {
        try {
            const { rows } = await this.db.query(
                'SELECT bde.uuid, bde.name, spe.name as spe_name, spe.min_year, spe.max_year FROM bde JOIN specialties as spe ON uuid = bde_uuid WHERE uuid=$1',
                [uuid]
            );
            if (rows.length >= 1) {
                const row = rows[0];
                let bde: BDE = {
                    name: row.name,
                    uuid: row.uuid,
                    specialties: [],
                };
                rows.forEach((row) => bde.specialties.push({ name: row.spe_name, minYear: row.min_year, maxYear: row.max_year }));
                return bde;
            }
            throw new BDEServiceError('No BDE with the given UUID exists.', BDEErrorType.BDE_NOT_EXISTS);
        } catch (_) {
            throw new BDEServiceError('Unable to fetch BDE.', BDEErrorType.INTERNAL);
        }
    }

}