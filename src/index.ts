import express, { Response as ExpressResponse } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { BDEController, UsersController, AuthenticationService, DEFAULT_HASH_STRATEGY, Response } from 'generic-backend';
import { PostgresBDEService } from './services/bde.service';
import { PostgresUsersService } from './services/users.service';
import { NodeMailerMailingService } from './services/mailing.service';

const port = process.env.PORT || 3000;
const app = express();
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const db = new Pool({
    connectionString: dbUrl,
});

const main = async () => {
    const transport = await NodeMailerMailingService.createTestTransport();

    const mailingService = new NodeMailerMailingService(transport);
    const bdeService = new PostgresBDEService(db);
    const usersService = new PostgresUsersService(db);
    const bdeController = new BDEController(bdeService);
    const authService = new AuthenticationService(usersService, DEFAULT_HASH_STRATEGY);
    const usersController = new UsersController(usersService, authService, mailingService);
    
    app.use(bodyParser.json());
    app.use(cors());
    
    const forwardTo = (res: ExpressResponse) => (response: Response) => res.status(response.code).json(response.body);
    
    app.post('/bde', (req, res) => bdeController.create(req.body).then(forwardTo(res)));
    app.get('/bde', (_, res) => bdeController.listAll().then(forwardTo(res)));
    app.get('/bde/:uuid', (req, res) => bdeController.getBDE(req.params.uuid).then(forwardTo(res)));

    app.post('/users/unregistered', (req, res) => usersController.create(req.body).then(forwardTo(res)));
    app.get('/users/unregistered/:uuid', (req, res) => usersController.getUnregisteredUser(req.params.uuid).then(forwardTo(res)));

    app.post('/login', (req, res) => usersController.connectUser(req.body).then(forwardTo(res)));
    app.post('/register', (req, res) => usersController.finishUserRegistration(req.body).then(forwardTo(res)));
    
    app.listen(port, () => {
        console.log(`Server listening on port ${port}.`);
    });

    process.on('beforeExit', async () => {
        await db.end();
    });
}

main();