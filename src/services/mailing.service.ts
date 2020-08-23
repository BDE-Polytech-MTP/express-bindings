import { MailingService, UnregisteredUser } from '@bde-polytech-mtp/base-backend';
import * as nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

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

    private mailBody?: string;

    constructor(private transporter: nodemailer.Transporter) {}

    async sendRegistrationMail(user: UnregisteredUser): Promise<void> {
        const frontURL = process.env.FRONT_URL || 'http://localhost:4200';
        const mailBody = await this.getMailBody();

        const info = await this.transporter.sendMail({
            from: `"BDE Polytech" <${process.env.MAIL_USER || 'noreply@bde-polytech.fr'}>`,
            to: user.email,
            subject: 'Inscription sur le site web du BDE',
            text: `Inscrivez-vous sur le site du BDE à l'url suivante : ${frontURL}/account/confirm?uuid=${user.userUUID}`,
            html: mailBody.replace(/{{frontURL}}/g, frontURL).replace(/{{registerURL}}/g, `${frontURL}/account/confirm?uuid=${user.userUUID}`),
        });

        const previewURL = nodemailer.getTestMessageUrl(info);
        if (previewURL) {
            console.log('Preview URL: %s', previewURL);
        }
    }

    private async getMailBody(): Promise<string> {
        if (this.mailBody) {
            return this.mailBody;
        }

        const templatePath = path.resolve('assets', 'mail-template.html');

        return new Promise((resolve, reject) => {
            fs.readFile(templatePath, { encoding: 'utf-8' }, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    this.mailBody = data;
                    resolve(data);
                }
            });
        });
    }

}