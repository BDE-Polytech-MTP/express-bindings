import { BDEService, BDE, BDEServiceError, BDEErrorType } from 'generic-backend';
import { Pool } from 'pg'; 

export class PostgresBDEService implements BDEService {

    constructor(private db: Pool) {}
    
    async create(bde: BDE): Promise<BDE> {
        try {
            await this.db.query('INSERT INTO bde (uuid, name, specialties) VALUES ($1, $2, $3)', [bde.uuid, bde.name, bde.specialties]);
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
            let {rows} = await this.db.query('SELECT * FROM bde');
            return rows;
        } catch (e) {
            throw new BDEServiceError('Unable to fetch all BDEs', BDEErrorType.INTERNAL);
        }
    }

    async findByUUID(uuid: string): Promise<BDE> {
        try {
            const { rows } = await this.db.query('SELECT * FROM bde WHERE uuid=$1', [uuid]);
            if (rows.length === 1) {
                const row = rows[0];
                return {
                    name: row.name,
                    uuid: row.uuid,
                    specialties: row.specialties,
                };
            }
            throw new BDEServiceError('No BDE with the given UUID exists.', BDEErrorType.BDE_NOT_EXISTS);
        } catch (_) {
            throw new BDEServiceError('Unable to fetch BDE.', BDEErrorType.INTERNAL);
        }
    }

}