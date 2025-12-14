import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

const mockNotificationService = {
  findLogsByUser: jest.fn(),
};

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotificationsByUser', () => {
    it('should return logs array when service returns data', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockLogs = [{ id: '1', message: 'Log 1', user_id: userId }];
      mockNotificationService.findLogsByUser.mockResolvedValue(mockLogs);

      const result = await controller.getNotificationsByUser(userId);

      expect(service.findLogsByUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockLogs);
    });

    it('should return formatted message object when logs are empty', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockNotificationService.findLogsByUser.mockResolvedValue([]);

      const result = await controller.getNotificationsByUser(userId);

      expect(result).toEqual({
        message: `No notifications found for user ${userId}.`,
        notifications: [],
      });
    });
  });
});
