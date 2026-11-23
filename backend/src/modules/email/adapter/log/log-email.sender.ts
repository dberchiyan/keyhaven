import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { type EmailMessage, EmailSender } from '@/modules/email/service/email-sender';

/**
 * Local development without a mail server (EMAIL_TRANSPORT=log): the whole message, links
 * included, goes to the log — that is how a developer opens the verification link. Never the
 * production transport (the config schema makes `smtp` require SMTP_URL, and the README says so).
 */
@Injectable()
export class LogEmailSender extends EmailSender {
    constructor(@InjectPinoLogger(LogEmailSender.name) private readonly logger: PinoLogger) {
        super();
    }

    send(message: EmailMessage): Promise<void> {
        this.logger.info({ to: message.to, subject: message.subject, text: message.text }, 'Email (log transport)');
        return Promise.resolve();
    }
}
