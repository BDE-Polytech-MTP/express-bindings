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
            html: `Inscrivez vous site le site du BDE <a href="${frontURL}/account/confirm?uuid=${user.uuid}">ici</a>`
        });

        const previewURL = nodemailer.getTestMessageUrl(info);
        if (previewURL) {
            console.log('Preview URL: %s', previewURL);
        }
    }

}