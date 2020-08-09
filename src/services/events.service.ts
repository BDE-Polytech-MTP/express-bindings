import { EventsService, Event, EventsErrorType, EventsServiceError, EventState } from '@bde-polytech-mtp/base-backend';
import { Pool } from 'pg';

export class PostgresEventsService implements EventsService {

    constructor(private db: Pool) {}

    async create(event: Event): Promise<Event> {
        try {
            await this.db.query(
                'INSERT INTO events (uuid, name, booking_start, booking_end, event_date, event_state, bde_uuid, is_draft) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [
                    event.uuid,
                    event.name,
                    event.bookingStart ? event.bookingStart.toISO() : null,
                    event.bookingEnd ? event.bookingEnd.toISO() : null,
                    event.eventDate ? event.eventDate.toISO() : null,
                    event.eventState,
                    event.bdeUUID,
                    event.isDraft
                ]
            );
        } catch (e) {
            if (e.constraint === 'pk_events') {
                throw new EventsServiceError('Generated UUID is already used.', EventsErrorType.INTERNAL);
            } else if (e.constraint === 'fk_events_bde') {
                throw new EventsServiceError('No BDE with the give UUID exists.', EventsErrorType.BDE_UUID_NOT_EXISTS);
            }
            console.error(e);
            throw new EventsServiceError(`Unexpected error.`, EventsErrorType.INTERNAL);
        }
        return event;
    }

    delete(uuid: string): Promise<Event> {
        throw new Error("Method not implemented.");
    }

    async findByUUID(uuid: string): Promise<Event> {
        try {
            const { rows } = await this.db.query('SELECT * FROM events WHERE uuid=$1', [uuid]);
            if (rows.length === 1) {
                const row = rows[0];
                return {
                    bdeUUID: row['bde_uuid'],
                    eventState: row['event_state'],
                    isDraft: row['is_draft'],
                    name: row['name'],
                    uuid: row['uuid'],
                    bookingStart: row['booking_start'],
                    bookingEnd: row['booking_end'],
                    eventDate: row['event_date'],
                };
            }
        } catch (e) {
            console.error(e);
            throw new EventsServiceError('Unexpected error.', EventsErrorType.INTERNAL);
        }
        throw new EventsServiceError('Not found.', EventsErrorType.EVENT_NOT_EXISTS);
    }

    async findByBDE(bdeUUID: string): Promise<Event[]> {
        try {
            const { rows } = await this.db.query('SELECT * FROM events WHERE bde_uuid=$1', [bdeUUID]);
            return rows;
        } catch (e) {
            console.error(e);
            throw new EventsServiceError('Unexpected error.', EventsErrorType.INTERNAL);
        }
    }

    async findAll(): Promise<Event[]> {
        try {
            const { rows } = await this.db.query('SELECT * FROM events');
            return rows;
        } catch (e) {
            console.error(e);
            throw new EventsServiceError('Unexpected error.', EventsErrorType.INTERNAL);
        }
    }

}