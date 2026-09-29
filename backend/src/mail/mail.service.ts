import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get('SMTP_PORT', 587));

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          },
        })
      : null;
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      // No SMTP configured: print the email in the terminal so you can test locally
      this.logger.log(`Email NOT sent (SMTP_HOST is empty)\nTo: ${to}\nSubject: ${subject}\n\n${text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to,
      subject,
      text,
    });
  }
}
