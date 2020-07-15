# Express-bindings

This projects aims to provide an implementation of [base-backend](https://github.com/BDE-Polytech-MTP/base-backend) project that works on a dedicated
server. This implementation is powered with the following node packages :

* [Express](https://www.npmjs.com/package/express) : to handle routing and request parsing
* [Pg](https://www.npmjs.com/package/pg) : to save application state to a PostgresSQL database
* [Marv](https://www.npmjs.com/package/marv) : to migrate the database
* [NodeMailer](https://www.npmjs.com/package/nodemailer) : to send mails

## Deployement

To deploy this implementation, just clone the repository, install required packages with `npm install` then run the server with `node ./dist/index.js`.

You **MUST** define the following environment variables if you want the application to work properly :

* `JWT_SECRET` : The passphrase to pass to HMAC256 algorithm used to hash JWT (default: `jwtsecret`)
* `MAIL_HOST` : The host for the SMTP server (use ethereal test account if missing)
* `MAIL_USER` : The user to use for email sending  (use ethereal test account if missing)
* `MAIL_PASSWORD` : The password for the specified user above (use ethereal test account if missing)
* `DATABASE_URL` : URL to the PostgresSQL database (default: `postgresql://postgres:postgres@localhost:5432/postgres`)
* `FRONT_URL` : The URL to the root domain of the frontend of the application (will be used in sent mails) (default: `localhost:4200`)

## Contributing

To contribute to this project just fork it, clone it, make any modifications and push them to your forked repository then create a [pull request](https://github.com/BDE-Polytech-MTP/express-bindings/pulls) to the project. I'll then take a look at it.