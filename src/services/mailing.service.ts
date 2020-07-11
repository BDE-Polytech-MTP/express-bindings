import { MailingService, UnregisteredUser } from 'generic-backend';
import * as nodemailer from 'nodemailer';

export class NodeMailerMailingService implements MailingService {

    static async createTestTransport(): Promise<nodemailer.Transporter> {
        const account = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: account.user,
              pass: account.pass,
        }});
    }

    constructor(private transporter: nodemailer.Transporter) {}

    async sendRegistrationMail(user: UnregisteredUser): Promise<void> {
        const frontURL = process.env.FRONT_URL || 'http://localhost:4200';
        const info = await this.transporter.sendMail({
            from: `"BDE Polytech" <${process.env.MAIL_USER || 'noreply@bde-polytech.fr'}>`,
            to: user.email,
            subject: 'Inscription sur le site web du BDE',
            text: `Inscrivez-vous sur le site du BDE à l'url suivante : ${frontURL}/account/confirm?uuid=${user.uuid}`,
            html: `
                    <style>
                        .container {
                            padding: 0 10px;
                            width: 500px;
                            border-left: 3px solid #003865;
                            border-right: 3px solid #003865;
                            font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
                        }
                    
                        .header {
                            display: flex;
                            flex-direction: row;
                            vertical-align: middle;
                            background-color: #003865;
                            color: white;
                        }
                    
                        .header img {
                            height: 72px;
                            background-color: white;
                            border-radius: 100%;
                            margin: 10px;
                            margin-right: 40px;
                        }
                    
                        .content {
                            color: #222222;
                        }
                    
                        .register {
                            display: block;
                            width: 70%;
                            text-align: center;
                            font-size: 1.5em;
                            margin: 0 15%;
                            margin-top: 2em;
                            padding: 5px;
                            box-sizing: border-box;
                            background-color: #003865;
                            text-decoration: none;
                            color: white;
                        }
                    
                        .footer {
                            margin-top: 40px;
                            width: 100%;
                            font-size: x-small;
                            color: grey;
                        }
                    
                        .footer a {
                            color: grey;
                        }
                    </style>
                    
                    <div class="container">
                        <div class="header">
                            <img src="${frontURL}/assets/icons/icon-512x512.png">
                            <h1>BDE Polytech</h1>
                        </div>
                    
                        <p class="content">
                            Bonjour,<br><br>
                            Vous êtes invité à vous inscrire sur le site du BDE de Polytech afin de pouvoir accéder à la réservation des événements organisés par celui-ci.
                        </p>
                    
                        <a class="register" href="${frontURL}/account/confirm?uuid=${user.uuid}">
                            S'inscrire
                        </a>
                    
                        <div class="footer">
                            Site du BDE : <a href="#">${frontURL}</a><br>
                            Contact <a href="mailto:florent.hugouvieux@protonmail.com">"Florent HUGOUVIEUX" &lt;florent.hugouvieux@protonmail.com&gt;</a>
                        </div>
                    </div>        
            `
        });

        const previewURL = nodemailer.getTestMessageUrl(info);
        if (previewURL) {
            console.log('Preview URL: %s', previewURL);
        }
    }

}