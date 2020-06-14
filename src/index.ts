import express from 'express';
import bodyParser from 'body-parser';
import { Pool } from 'pg';
import { BDEController, UsersController, AuthenticationService, DEFAULT_HASH_STRATEGY } from 'generic-backend';
import { PostgresBDEService } from './services/bde.service';
import { PostgresUsersService } from './services/users.service';

const port = process.env.PORT || 3000;
const app = express();
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const db = new Pool({
    connectionString: dbUrl,
});

const bdeService = new PostgresBDEService(db);
const usersService = new PostgresUsersService(db);
const bdeController = new BDEController(bdeService);
const authService = new AuthenticationService(usersService, DEFAULT_HASH_STRATEGY);
const usersController = new UsersController(usersService, authService);

app.use(bodyParser.json());

app.post('/bde', (req, res) => bdeController.create(req.body).then((response) => res.status(response.code).json(response.body)));
app.post('/users', (req, res) => usersController.create(req.body).then((response) => res.status(response.code).json(response.body)));

app.listen(port, () => {
    console.log(`Server listening on port ${port}.`);
});

process.on('beforeExit', async () => {
    await db.end();
});