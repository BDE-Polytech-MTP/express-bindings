import {Pool, PoolClient} from 'pg';

export async function transaction(db: Pool, executor: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        await executor(client);
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}