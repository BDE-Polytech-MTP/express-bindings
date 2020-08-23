import { EventsService, Event, EventsErrorType, EventsServiceError } from '@bde-polytech-mtp/base-backend';
import { Pool } from 'pg';
import { DateTime } from 'luxon';

interface EventRow {
    event_uuid: string;
    event_name: string;
    booking_start: string | null;
    booking_end: string | null;
    event_date: string | null;
    bde_uuid: string;
    is_draft: boolean;
}

export class PostgresEventsService implements EventsService {

    constructor(private db: Pool) {}

    private mapEventRowToEvent(row: EventRow): Event {
        return {
            bdeUUID: row.bde_uuid,
            isDraft: row.is_draft,
            eventName: row.event_name,
            eventUUID: row.event_uuid,
            bookingStart: row.booking_start ? DateTime.fromISO(row.booking_start) : undefined,
            bookingEnd: row.booking_end ? DateTime.fromISO(row.booking_end) : undefined,
            eventDate: row.event_date ? DateTime.fromISO(row.event_date) : undefined,
        };
    }

    async create(event: Event): Promise<Event> {
        try {
            await this.db.query(
                'INSERT INTO events (event_uuid, event_name, booking_start, booking_end, event_state, bde_uuid, is_draft) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [
                    event.eventUUID,
                    event.eventName,
                    event.bookingStart ? event.bookingStart.toISO() : null,
                    event.bookingEnd ? event.bookingEnd.toISO() : null,
                    event.eventDate ? event.eventDate.toISO() : null,
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
            throw new EventsServiceError(`Unexpected error.\n${e}`, EventsErrorType.INTERNAL);
        }
        return event;
    }

    delete(uuid: string): Promise<Event> {
        throw new Error("Method not implemented.");
    }

    update(event: Event): Promise<Event> {
        throw new Error("Method not implemented.");
    }

    async findByUUID(uuid: string): Promise<Event> {
        try {
            const { rows }: { rows: EventRow[] } = await this.db.query('SELECT * FROM events WHERE event_uuid=$1', [uuid]);
            if (rows.length === 1) {
                const row = rows[0];
                return this.mapEventRowToEvent(row);
            }
        } catch (e) {
            throw new EventsServiceError(`Unexpected error.\n${e}`, EventsErrorType.INTERNAL);
        }
        throw new EventsServiceError('Not found.', EventsErrorType.EVENT_NOT_EXISTS);
    }

    async findByBDE(bdeUUID: string): Promise<Event[]> {
        try {
            const { rows }: { rows: EventRow[] } = await this.db.query('SELECT * FROM events WHERE bde_uuid=$1', [bdeUUID]);
            return rows.map(this.mapEventRowToEvent);
        } catch (e) {
            throw new EventsServiceError(`Unexpected error.\n${e}`, EventsErrorType.INTERNAL);
        }
    }

    async findAll(): Promise<Event[]> {
        try {
            const { rows }: { rows: EventRow[] } = await this.db.query('SELECT * FROM events');
            return rows.map(this.mapEventRowToEvent);
        } catch (e) {
            throw new EventsServiceError(`Unexpected error.\n${e}`, EventsErrorType.INTERNAL);
        }
    }

}