import { Module } from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service';
import { EmailTransport } from '../../common/config/env.schema';
import { LogEmailSender } from './adapter/log/log-email.sender';
import { SmtpEmailSender } from './adapter/smtp/smtp-email.sender';
import { EmailSender } from './service/email-sender';

/**
 * Email delivery behind the `EmailSender` port; the transport is configuration (EMAIL_TRANSPORT),
 * never a code branch in the features that send mail.
 */
@Module({
  providers: [
    LogEmailSender,
    SmtpEmailSender,
    {
      provide: EmailSender,
      inject: [AppConfigService, LogEmailSender, SmtpEmailSender],
      useFactory: (
        config: AppConfigService,
        log: LogEmailSender,
        smtp: SmtpEmailSender,
      ): EmailSender => (config.get('EMAIL_TRANSPORT') === EmailTransport.SMTP ? smtp : log),
    },
  ],
  exports: [EmailSender],
})
export class EmailModule {}
