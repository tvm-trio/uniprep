// 1. MOCK NODEMAILER & HANDLEBARS (Must be at the top)
// We mock these to prevent real network calls and avoid the import error
jest.mock('nodemailer-express-handlebars', () => () => () => { });
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

  // Test Data
  let testUserId: string;
  const testEmail = 'integration-test@example.com';

  beforeAll(async () => {
    // 2. SETUP MOCKS
    sendMailMock = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
      use: jest.fn(), // Mock the 'use' method for handlebars
    });

    // 3. COMPILE MODULE
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

    // 4. PREPARE DB
    // Clean up potentially stale data
    await prisma.notification.deleteMany({
      where: { User: { email: testEmail } },
    });
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Create a real user for the test
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: 'hashed-password-placeholder',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // 5. CLEANUP
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
      // ARRANGE
      sendMailMock.mockResolvedValue({ messageId: 'test-message-id' });
      const mailOptions = {
        to: testEmail,
        subject: 'Integration Test Success',
        text: 'Testing success flow',
      };

      // ACT
      await mailService.sendMail(mailOptions, undefined, {
        userId: testUserId,
      });

      // ASSERT 1: Nodemailer was called
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: 'Integration Test Success',
        }),
      );

      // ASSERT 2: Database has a notification record
      const notifications = await prisma.notification.findMany({
        where: { user_id: testUserId },
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].message).toContain('Email successfully sent');
      expect(notifications[0].message).toContain('Integration Test Success');
    });

    it('should handle SMTP errors and automatically create a FAILURE notification in DB', async () => {
      // ARRANGE
      sendMailMock.mockRejectedValue({
        code: 'EAUTH',
        message: 'Invalid login',
      });
      const mailOptions = {
        to: testEmail,
        subject: 'Integration Test Failure',
        text: 'Testing failure flow',
      };

      // ACT & ASSERT
      await expect(
        mailService.sendMail(mailOptions, undefined, { userId: testUserId }),
      ).rejects.toThrow(); // Expect InternalServerErrorException

      // ASSERT 2: Database has a FAILURE notification record
      const notifications = await prisma.notification.findMany({
        where: {
          user_id: testUserId,
          message: { contains: 'Email FAILED' },
        },
      });

      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toContain('EAUTH'); // Checks for error code
      expect(notifications[0].message).toContain('Integration Test Failure');
    });
  });
});
