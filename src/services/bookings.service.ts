import { BookingsServiceError, BDEErrorType, BookingsService, Booking, Event } from "@bde-polytech-mtp/base-backend";
import { Pool } from 'pg';

export class PostgresBookingsService implements BookingsService {

    constructor(private db: Pool) {}

    create(booking: Booking): Promise<Booking> {
        throw new Error("Method not implemented.");
    }

    findOne(userUUID: string, eventUUID: string): Promise<Booking & Event> {
        throw new Error("Method not implemented.");
    }

    findBookingsForEvent(eventUUID: string): Promise<(Booking & Event)[]> {
        throw new Error("Method not implemented.");
    }

    findBookingsForUser(userUUID: string): Promise<(Booking & Event)[]> {
        throw new Error("Method not implemented.");
    }

}