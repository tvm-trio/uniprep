jest.mock('nodemailer-express-handlebars', () => {
  return () => {
    return function (_mail, callback) {
      if (callback) callback();
    };
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { SendMailDto } from './dto/send-mail.dto';
import { TestWelcomeMailDto } from './dto/test-welcome-mail.dto';

const mockMailService = {
  sendMail: jest.fn(),
};

describe('MailController', () => {
  let controller: MailController;
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    controller = module.get<MailController>(MailController);
    service = module.get<MailService>(MailService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendTestEmail', () => {
    it('should call service.sendMail with strict DTO values', async () => {
      // ARRANGE
      // We must provide all @IsNotEmpty fields defined in SendMailDto
      const dto: SendMailDto = {
        email: 'test@example.com',
        subject: 'Strict Subject',
        text: 'Strict Text Content',
        userId: '550e8400-e29b-41d4-a716-446655440000', // valid UUID format
      };

      mockMailService.sendMail.mockResolvedValue({ messageId: 'msg-id-123' });

      // ACT
      const result = await controller.sendTestEmail(dto);

      // ASSERT
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        {
          to: dto.email,
          subject: dto.subject,
          text: dto.text,
          html: undefined, // Optional field was not provided
        },
        undefined, // Template is undefined for this endpoint
        { userId: dto.userId },
      );

      expect(result).toEqual({
        message: 'Test email successfully queued.',
        details: { messageId: 'msg-id-123' },
      });
    });

    it('should pass html content if provided in DTO', async () => {
      // ARRANGE
      const dto: SendMailDto = {
        email: 'test@example.com',
        subject: 'HTML Subject',
        text: 'Fallback text',
        html: '<p>HTML Content</p>',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // ACT
      await controller.sendTestEmail(dto);

      // ASSERT
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<p>HTML Content</p>',
        }),
        undefined,
        expect.anything(),
      );
    });
  });

  describe('testWelcomeEmail', () => {
    it('should correctly map TestWelcomeMailDto properties to service call', async () => {
      // ARRANGE
      const dto: TestWelcomeMailDto = {
        recipientEmail: 'newuser@example.com',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockMailService.sendMail.mockResolvedValue({});

      // ACT
      const result = await controller.testWelcomeEmail(dto);

      // ASSERT
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: dto.recipientEmail,
          subject: expect.stringContaining('Welcome to UniPrep'),
        }),
        'welcome',
        {
          userEmail: dto.recipientEmail,
          userId: dto.userId,
        },
      );

      expect(result).toEqual({
        message: `Welcome email test successfully initiated to ${dto.recipientEmail}.`,
      });
    });
  });
});
