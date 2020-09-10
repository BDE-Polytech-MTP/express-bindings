import { BookingsServiceError, BookingsErrorType, BookingsService, Booking, Event, PartialUser } from "@bde-polytech-mtp/base-backend";
import { Pool } from 'pg';
import { DateTime } from 'luxon';

interface BookingRow {
    user_uuid: string;
    event_uuid: string;

    event_name: string;
    booking_start: Date | null;
    booking_end: Date | null;
    event_date: Date | null;
    bde_uuid: string;
    is_draft: boolean;

    firstname: string | null;
    lastname: string | null;
    specialty_name: string | null;
    specialty_year: number | null;
}

export class PostgresBookingsService implements BookingsService {

    constructor(private db: Pool) {}

    private mapBookingRowToBookingAndEventAndUser(row: BookingRow): Booking & Event & PartialUser {
        return {
            eventUUID: row.event_uuid,
            userUUID: row.user_uuid,
            bdeUUID: row.bde_uuid,
            eventName: row.event_name,
            isDraft: row.is_draft,
            bookingEnd: row.booking_end ? DateTime.fromJSDate(row.booking_end) : undefined,
            bookingStart: row.booking_start ? DateTime.fromJSDate(row.booking_start) : undefined,
            eventDate: row.event_date ? DateTime.fromJSDate(row.event_date) : undefined,
            firstname: row.firstname || '',
            lastname: row.lastname || '',
            specialtyName: row.specialty_name || '',
            specialtyYear: row.specialty_year || 0,
        };
    }

    async create(booking: Booking): Promise<Booking> {
        try {
            await this.db.query('INSERT INTO bookings (user_uuid, event_uuid) VALUES ($1, $2)', [booking.userUUID, booking.eventUUID]);
            return booking;
        } catch (e) {
            switch(e.constraint) {
                case 'pk_booking':
                    throw new BookingsServiceError(
                        `Booking (event: ${booking.eventUUID}, user: ${booking.userUUID}) already exists.`,
                        BookingsErrorType.BOOKING_ALREADY_EXISTS
                    );
                case 'fk_booking_events':
                    throw new BookingsServiceError(`Event ${booking.eventUUID} does not exist.`, BookingsErrorType.EVENT_NOT_EXISTS);
                case 'fk_booking_users':
                    throw new BookingsServiceError(`User ${booking.userUUID} does no exist.`, BookingsErrorType.USER_NOT_EXISTS);
                default:
                    throw new BookingsServiceError(
                        `Unable to create booking (event: ${booking.eventUUID}, user: ${booking.userUUID}). Internal.`,
                        BookingsErrorType.INTERNAL
                    );
            }
        }
    }

    async findOne(userUUID: string, eventUUID: string): Promise<Booking & Event & PartialUser> {
        try {
            const { rows } : { rows: BookingRow[] } = await this.db.query(
                'SELECT * FROM bookings NATURAL JOIN events NATURAL JOIN users WHERE event_uuid=$1 AND user_uuid=$2',
                [eventUUID, userUUID]
            );
            if (rows.length > 0) {
                const row = rows[0];
                return this.mapBookingRowToBookingAndEventAndUser(row);
            }
            return Promise.reject(new BookingsServiceError('Not found.', BookingsErrorType.BOOKING_NOT_EXISTS));
        } catch (e) {
            throw new BookingsServiceError(`Unable to fetch booking.\n${e}`, BookingsErrorType.INTERNAL);
        }
    }

    async findBookingsForEvent(eventUUID: string): Promise<(Booking & Event & PartialUser)[]> {
        try {
            const { rows } : { rows: BookingRow[] } = await this.db.query(
                'SELECT * FROM bookings NATURAL JOIN events NATURAL JOIN users WHERE event_uuid=$1',
                [eventUUID]
            );
            return rows.map(this.mapBookingRowToBookingAndEventAndUser);
        } catch (e) {
            throw new BookingsServiceError(`Unable to fetch bookings for event ${eventUUID}.\n${e}`, BookingsErrorType.INTERNAL);
        }
    }

    async findBookingsForUser(userUUID: string): Promise<(Booking & Event & PartialUser)[]> {
        try {
            const { rows } : { rows: BookingRow[] } = await this.db.query(
                'SELECT * FROM bookings NATURAL JOIN events NATURAL JOIN users WHERE user_uuid=$1', [userUUID]
            );
            return rows.map(this.mapBookingRowToBookingAndEventAndUser);
        } catch (e) {
            throw new BookingsServiceError(`Unable to fetch bookings for user ${userUUID}.\n${e}`, BookingsErrorType.INTERNAL);
        }
    }

}