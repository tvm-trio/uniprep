import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { join } from 'path';
import { MailOptions } from './interfaces/mail-options.interface';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private templateTransporter: nodemailer.Transporter;
  private hbs: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    const mailConfig = {
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(mailConfig);
    this.templateTransporter = nodemailer.createTransport(mailConfig);
  }

  async onModuleInit() {
    const mod = await import('nodemailer-express-handlebars');
    this.hbs = mod.default ?? mod;

    const viewsPath = join(
      process.cwd(),
      'dist',
      'apps',
      'api',
      'src',
      'mail',
      'templates',
    );

    console.log('Template View Path:', viewsPath);

    this.templateTransporter.use(
      'compile',
      this.hbs({
        viewEngine: {
          extname: '.hbs',
          partialsDir: viewsPath,
          defaultLayout: false,
        },
        viewPath: viewsPath,
        extName: '.hbs',
      }),
    );
  }

  async sendMail(
    options: MailOptions,
    template: string | undefined,
    context: Record<string, any>,
  ) {
    const mailOptions: any = {
      from: `"UniPrep" <${this.configService.get<string>('GMAIL_USER')}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      let info;

      if (template) {
        mailOptions.template = template;
        mailOptions.context = context;
        info = await this.templateTransporter.sendMail(mailOptions);
      } else {
        info = await this.transporter.sendMail(mailOptions);
      }

      await this.notificationService.createLog({
        user_id: context.userId,
        message: `Email successfully sent: ${options.subject}`,
      });

      return info;
    } catch (error: any) {
      await this.notificationService.createLog({
        user_id: context.userId,
        message: `Email FAILED (${error.code || 'SMTP_ERROR'}): ${options.subject}`,
      });

      throw new InternalServerErrorException('Failed to send email.');
    }
  }
}