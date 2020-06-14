import { BDEService, BDE, BDEServiceError, BDEErrorType } from 'generic-backend';
import { Pool } from 'pg'; 

export class PostgresBDEService implements BDEService {

    constructor(private db: Pool) {};
    
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

}