import express, { Response as ExpressResponse } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { 
    BDEController, 
    UsersController, 
    EventsController,
    BookingsController,
    AuthenticationService, 
    DEFAULT_HASH_STRATEGY, 
    Response
} from '@bde-polytech-mtp/base-backend';
import { PostgresBDEService } from './services/bde.service';
import { PostgresUsersService } from './services/users.service';
import { NodeMailerMailingService } from './services/mailing.service';
import { PostgresEventsService } from './services/events.service';
import * as nodemailer from 'nodemailer';
import { StdLoggingService } from './services/logging.service';
import marv from 'marv/api/promise';
import marvPgDriver from 'marv-pg-driver';
import path from 'path';
import { PostgresBookingsService } from './services/bookings.service';

const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
const migrationsDirectory = path.resolve('migrations');

const main = async () => {
    /* Define pg connection information */
    const pgCredentials = {
        connectionString: dbUrl,
    };

    /* Apply migrations to database */
    const migrations = await marv.scan(migrationsDirectory);
    await marv.migrate(migrations, marvPgDriver({ connection: pgCredentials }));

    /* Create connection pool to database */
    const db = new Pool(pgCredentials);

    /* Create transport for mailing service */
    let transport: nodemailer.Transporter; 
    
    if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASSWORD) {
        transport = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            secure: false,
            ignoreTLS: process.env.MAIL_DISABLE_TLS ? true : false,
            auth: {
                user: process.env.MAIL_CRED_USER || process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD,
            }
        });
    } else {
        transport = await NodeMailerMailingService.createTestTransport();
        console.log('Using testing mailing transporter.');
    }

    await transport.verify();

    /* Create services */
    const loggingService = new StdLoggingService();
    const mailingService = new NodeMailerMailingService(transport);
    const bdeService = new PostgresBDEService(db);
    const usersService = new PostgresUsersService(db);
    const eventsService = new PostgresEventsService(db);
    const bookingsService = new PostgresBookingsService(db);
    const authService = new AuthenticationService(usersService, DEFAULT_HASH_STRATEGY);

    /* Create controllers */
    const bdeController = new BDEController(bdeService, mailingService, loggingService);
    const usersController = new UsersController(usersService, authService, mailingService, loggingService);
    const eventsController = new EventsController(eventsService, authService, loggingService);
    const bookingsController = new BookingsController(bookingsService, eventsService, authService, loggingService);
    
    /* Create Express app, add middlewares and mount controllers */
    const app = express();

    // Middlewares
    app.use(bodyParser.json());
    app.use(cors());
    
    // Mounting controllers
    const forwardTo = (res: ExpressResponse) => (response: Response) => res.status(response.code).json(response.body);
    
    app.post('/bde', (req, res) => bdeController.create(req.body).then(forwardTo(res)));
    app.get('/bde', (_, res) => bdeController.listAll().then(forwardTo(res)));
    app.get('/bde/:uuid', (req, res) => bdeController.getBDE(req.params.uuid).then(forwardTo(res)));
    app.get('/bde/:uuid/users', (req, res) => usersController.listUsersForBDE(req.params.uuid, req.headers.authorization).then(forwardTo(res)));

    app.post('/users/unregistered', (req, res) => usersController.create(req.body, req.headers.authorization).then(forwardTo(res)));
    app.get('/users/unregistered/:uuid', (req, res) => usersController.getUnregisteredUser(req.params.uuid).then(forwardTo(res)));
    app.get('/users/registered/:uuid/bookings', (req, res) => bookingsController.findUserBookings(req.params.uuid, req.headers.authorization).then(forwardTo(res)));
    app.get('/users/registered/:userUUID/bookings/:eventUUID',
        (req, res) => bookingsController.findOne(req.params.eventUUID, req.params.userUUID, req.headers.authorization).then(forwardTo(res))
    );
    app.post('/users/registered/:userUUID/bookings/:eventUUID',
        (req, res) => bookingsController.create(req.params.eventUUID, req.params.userUUID, req.body, req.headers.authorization).then(forwardTo(res))
    );

    app.get('/events', (req, res) => eventsController.findAll(req.headers.authorization).then(forwardTo(res)));
    app.post('/events', (req, res) => eventsController.create(req.body, req.headers.authorization).then(forwardTo(res)));
    app.get('/events/:eventUUID', (req, res) => eventsController.findOne(req.params.eventUUID, req.headers.authorization).then(forwardTo(res)));
    app.get('/events/:eventUUID/bookings', (req, res) => bookingsController.findEventBookings(req.params.eventUUID, req.headers.authorization).then(forwardTo(res)));
    app.get('/events/:eventUUID/bookings/:userUUID',
        (req, res) => bookingsController.findOne(req.params.eventUUID, req.params.userUUID, req.headers.authorization).then(forwardTo(res))
    );
    app.post('/events/:eventUUID/bookings/:userUUID',
        (req, res) => bookingsController.create(req.params.eventUUID, req.params.userUUID, req.body, req.headers.authorization).then(forwardTo(res))
    );

    app.post('/login', (req, res) => usersController.connectUser(req.body).then(forwardTo(res)));
    app.post('/register', (req, res) => usersController.finishUserRegistration(req.body).then(forwardTo(res)));
    
    /* Start application */
    app.listen(port, () => {
        console.log(`Server listening on port ${port}.`);
    });

    /* Add callback to disconnect database pool on process exit */
    process.on('beforeExit', async () => {
        await db.end();
    });
}

main().catch((e) => console.error(e));