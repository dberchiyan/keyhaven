import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfigService } from '../../../../common/config/app-config.service';
import { UpstreamUnavailableException } from '../../../../common/exception/api.exception';
import { MetricsService } from '../../../../common/observability/metrics.service';
import { type EmailMessage, EmailSender } from '../../service/email-sender';

/** Every outbound call has a timeout (architecture.md → async). */
const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 15_000;

/** SMTP delivery (EMAIL_TRANSPORT=smtp) through SMTP_URL; the From header is EMAIL_FROM. */
@Injectable()
export class SmtpEmailSender extends EmailSender {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    config: AppConfigService,
    private readonly metrics: MetricsService,
    @InjectPinoLogger(SmtpEmailSender.name) private readonly logger: PinoLogger,
  ) {
    super();
    // With the log transport there is no SMTP_URL: a placeholder keeps the (unused) provider valid.
    const url = new URL(config.get('SMTP_URL') ?? 'smtp://localhost');
    const secure = url.protocol === 'smtps:';
    this.transporter = createTransport({
      host: url.hostname,
      port: url.port ? Number(url.port) : secure ? 465 : 587,
      secure,
      ...(url.username
        ? {
            auth: {
              user: decodeURIComponent(url.username),
              pass: decodeURIComponent(url.password),
            },
          }
        : {}),
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
    this.from = config.get('EMAIL_FROM');
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      const info: unknown = await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.metrics.emailsSent.inc({ outcome: 'sent' });
      this.logger.info({ messageId: readMessageId(info), subject: message.subject }, 'Email sent');
    } catch (error: unknown) {
      // Provider error text stays in the log; the caller gets our exception (integrations.md).
      this.metrics.emailsSent.inc({ outcome: 'failed' });
      this.logger.warn({ err: error, subject: message.subject }, 'Email delivery failed');
      throw new UpstreamUnavailableException();
    }
  }
}

const readMessageId = (info: unknown): string | null =>
  typeof info === 'object' && info !== null && 'messageId' in info ? String(info.messageId) : null;
