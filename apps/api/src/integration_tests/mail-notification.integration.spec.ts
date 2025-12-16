jest.mock('nodemailer-express-handlebars', () => () => () => {});
jest.mock('nodemailer');

import { Test, TestingModule } from '@nestjs/testing';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notification/notification.module';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../common/prisma';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import * as nodemailer from 'nodemailer';

describe('Mail & Notification Integration', () => {
  let moduleRef: TestingModule;
  let mailService: MailService;
  let prisma: PrismaService;
  let sendMailMock: jest.Mock;

  let testUserId: string;
  const testEmail = 'integration-test@example.com';

  beforeAll(async () => {
    sendMailMock = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
      use: jest.fn(),
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        MailModule,
        NotificationModule,
      ],
    }).compile();

    mailService = moduleRef.get<MailService>(MailService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.notification.deleteMany({
      where: { User: { email: testEmail } },
    });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: 'hashed-password-placeholder',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.notification.deleteMany({ where: { user_id: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await moduleRef.close();
  });

  beforeEach(() => {
    sendMailMock.mockClear();
  });

  describe('Email Sending Flow', () => {
    it('should send an email and automatically create a SUCCESS notification in DB', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'test-message-id' });
      const mailOptions = {
        to: testEmail,
        subject: 'Integration Test Success',
        text: 'Testing success flow',
      };

      await mailService.sendMail(mailOptions, undefined, {
        userId: testUserId,
      });

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: 'Integration Test Success',
        }),
      );

      const notifications = await prisma.notification.findMany({
        where: { user_id: testUserId },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].message).toContain('Email successfully sent');
      expect(notifications[0].message).toContain('Integration Test Success');
    });

    it('should handle SMTP errors and automatically create a FAILURE notification in DB', async () => {
      sendMailMock.mockRejectedValue({
        code: 'EAUTH',
        message: 'Invalid login',
      });
      const mailOptions = {
        to: testEmail,
        subject: 'Integration Test Failure',
        text: 'Testing failure flow',
      };

      await expect(
        mailService.sendMail(mailOptions, undefined, { userId: testUserId }),
      ).rejects.toThrow();

      const notifications = await prisma.notification.findMany({
        where: {
          user_id: testUserId,
          message: { contains: 'Email FAILED' },
        },
      });

      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toContain('EAUTH');
      expect(notifications[0].message).toContain('Integration Test Failure');
    });
  });
});
