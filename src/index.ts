import express, { Response as ExpressResponse, Router } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Pool } from "pg";
import {
  BDEController,
  UsersController,
  EventsController,
  BookingsController,
  AuthenticationService,
  DEFAULT_HASH_STRATEGY,
  Response,
} from "@bde-polytech-mtp/base-backend";
import { PostgresBDEService } from "./services/bde.service";
import { PostgresUsersService } from "./services/users.service";
import { NodeMailerMailingService } from "./services/mailing.service";
import { PostgresEventsService } from "./services/events.service";
import * as nodemailer from "nodemailer";
import { StdLoggingService } from "./services/logging.service";
import marv from "marv/api/promise";
import marvPgDriver from "marv-pg-driver";
import path from "path";
import { PostgresBookingsService } from "./services/bookings.service";

const port = process.env.PORT || 3000;
const dbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";
const migrationsDirectory = path.resolve("migrations");

const forwardTo = (res: ExpressResponse) => (response: Response) =>
  res.status(response.code).json(response.body);

const createBDERouter = (
  bdeController: BDEController,
  usersController: UsersController
) => {
  const bdeRouter = Router();
  bdeRouter
    .route("/")
    .get((_, res) => bdeController.listAll().then(forwardTo(res)))
    .post((req, res) => bdeController.create(req.body).then(forwardTo(res)));
  bdeRouter.get("/:uuid", (req, res) =>
    bdeController.getBDE(req.params.uuid).then(forwardTo(res))
  );
  bdeRouter.get("/:uuid/users", (req, res) =>
    usersController
      .listUsersForBDE(req.params.uuid, req.headers.authorization)
      .then(forwardTo(res))
  );

  return bdeRouter;
};

const createUsersRouter = (
  usersController: UsersController,
  bookingsController: BookingsController
) => {
  const usersRouter = Router();
  usersRouter.post("/user-requests", (req, res) =>
    usersController.register(req.body).then(forwardTo(res))
  );
  usersRouter.post("/unregistered", (req, res) =>
    usersController
      .create(req.body, req.headers.authorization)
      .then(forwardTo(res))
  );
  usersRouter.get("/unregistered/:uuid", (req, res) =>
    usersController.getUnregisteredUser(req.params.uuid).then(forwardTo(res))
  );
  usersRouter.get("/registered/:uuid/bookings", (req, res) =>
    bookingsController
      .findUserBookings(req.params.uuid, req.headers.authorization)
      .then(forwardTo(res))
  );
  usersRouter.get("/registered/:userUUID/bookings/:eventUUID", (req, res) =>
    bookingsController
      .findOne(
        req.params.eventUUID,
        req.params.userUUID,
        req.headers.authorization
      )
      .then(forwardTo(res))
  );
  usersRouter.post("/registered/:userUUID/bookings/:eventUUID", (req, res) =>
    bookingsController
      .create(
        req.params.eventUUID,
        req.params.userUUID,
        req.body,
        req.headers.authorization
      )
      .then(forwardTo(res))
  );
  usersRouter.get("/:uuid", (req, res) =>
    usersController
      .getUser(req.params.uuid, req.headers.authorization)
      .then(forwardTo(res))
  );

  return usersRouter;
};

const createEventsRouter = (
  eventsController: EventsController,
  bookingsController: BookingsController
) => {
  const eventsRouter = Router();
  eventsRouter
    .route("/")
    .get((req, res) =>
      eventsController.findAll(req.headers.authorization).then(forwardTo(res))
    )
    .post((req, res) =>
      eventsController
        .create(req.body, req.headers.authorization)
        .then(forwardTo(res))
    );
  eventsRouter.get("/:eventUUID", (req, res) =>
    eventsController
      .findOne(req.params.eventUUID, req.headers.authorization)
      .then(forwardTo(res))
  );
  eventsRouter.get("/:eventUUID/bookings", (req, res) =>
    bookingsController
      .findEventBookings(req.params.eventUUID, req.headers.authorization)
      .then(forwardTo(res))
  );
  eventsRouter.get("/:eventUUID/bookings/:userUUID", (req, res) =>
    bookingsController
      .findOne(
        req.params.eventUUID,
        req.params.userUUID,
        req.headers.authorization
      )
      .then(forwardTo(res))
  );
  eventsRouter.post("/:eventUUID/bookings/:userUUID", (req, res) =>
    bookingsController
      .create(
        req.params.eventUUID,
        req.params.userUUID,
        req.body,
        req.headers.authorization
      )
      .then(forwardTo(res))
  );

  return eventsRouter;
};

const main = async () => {
  /* Define pg connection information */
  const pgCredentials = {
    connectionString: dbUrl,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  };

  /* Apply migrations to database */
  const migrations = await marv.scan(migrationsDirectory);
  await marv.migrate(migrations, marvPgDriver({ connection: pgCredentials }));

  /* Create connection pool to database */
  const db = new Pool(pgCredentials);

  /* Create transport for mailing service */
  let transport: nodemailer.Transporter;

  if (
    process.env.MAIL_HOST &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASSWORD
  ) {
    transport = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      secure: false,
      ignoreTLS: process.env.MAIL_DISABLE_TLS ? true : false,
      auth: {
        user: process.env.MAIL_CRED_USER || process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  } else {
    transport = await NodeMailerMailingService.createTestTransport();
    console.log("Using testing mailing transporter.");
  }

  try {
    await transport.verify();
  } catch (e) {
    console.error("-------------------------------------");
    console.error("Unable to connect to the smtp service");
    console.error("-------------------------------------");
    console.error(e);
    throw e;
  }

  /* Create services */
  const loggingService = new StdLoggingService();
  const mailingService = new NodeMailerMailingService(transport);
  const bdeService = new PostgresBDEService(db);
  const usersService = new PostgresUsersService(db);
  const eventsService = new PostgresEventsService(db);
  const bookingsService = new PostgresBookingsService(db);
  const authService = new AuthenticationService(
    usersService,
    DEFAULT_HASH_STRATEGY
  );

  /* Create controllers */
  const bdeController = new BDEController(
    bdeService,
    mailingService,
    loggingService
  );
  const usersController = new UsersController(
    usersService,
    authService,
    mailingService,
    loggingService
  );
  const eventsController = new EventsController(
    eventsService,
    authService,
    loggingService
  );
  const bookingsController = new BookingsController(
    bookingsService,
    eventsService,
    authService,
    loggingService
  );

  /* Create Express app, add middlewares and mount controllers */
  const app = express();

  // Middlewares
  app.use(bodyParser.json());
  app.use(cors());

  // Mounting controllers
  app.use("/bde", createBDERouter(bdeController, usersController));
  app.use("/users", createUsersRouter(usersController, bookingsController));
  app.use("/events", createEventsRouter(eventsController, bookingsController));
  app.post("/login", (req, res) =>
    usersController.connectUser(req.body).then(forwardTo(res))
  );
  app.post("/register", (req, res) =>
    usersController.finishUserRegistration(req.body).then(forwardTo(res))
  );

  /* Start application */
  app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
  });

  /* Add callback to disconnect database pool on process exit */
  process.on("beforeExit", async () => {
    await db.end();
  });
};

main().catch((e) => console.error(e));
