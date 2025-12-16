import { Test, TestingModule } from '@nestjs/testing';
import { ProgressTrackerController } from '../progress_tracker.controller';
import { ProgressTrackerService } from '../progress_tracker.service';
import { mockProgress, mockProgressList, mockMetrixBody } from './mocks';

describe('ProgressTrackerController', () => {
  let controller: ProgressTrackerController;
  let service: ProgressTrackerService;

  const mockProgressTrackerService = {
    getMetrix: jest.fn(),
    getMetrixById: jest.fn(),
    addMetrix: jest.fn(),
    updateMetrix: jest.fn(),
    deleteMetrix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressTrackerController],
      providers: [
        {
          provide: ProgressTrackerService,
          useValue: mockProgressTrackerService,
        },
      ],
    }).compile();

    controller = module.get<ProgressTrackerController>(
      ProgressTrackerController,
    );
    service = module.get<ProgressTrackerService>(ProgressTrackerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrix', () => {
    it('should return all metrics', async () => {
      mockProgressTrackerService.getMetrix.mockResolvedValue(mockProgressList);

      const result = await controller.getMetrix();

      expect(result).toEqual(mockProgressList);
      expect(service.getMetrix).toHaveBeenCalledWith();
      expect(service.getMetrix).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no metrics exist', async () => {
      mockProgressTrackerService.getMetrix.mockResolvedValue([]);

      const result = await controller.getMetrix();

      expect(result).toEqual([]);
      expect(service.getMetrix).toHaveBeenCalledWith();
    });
  });

  describe('getMetrixById', () => {
    it('should return metric for specific user and subject', async () => {
      const req = { user: { sub: 'user-1' } };
      const subjectId = 'subject-1';
      mockProgressTrackerService.getMetrixById.mockResolvedValue(mockProgress);

      const result = await controller.getMetrixById(req, subjectId);

      expect(result).toEqual(mockProgress);
      expect(service.getMetrixById).toHaveBeenCalledWith('user-1', subjectId);
    });

    it('should return null when metric does not exist', async () => {
      const req = { user: { sub: 'user-1' } };
      const subjectId = 'nonexistent-subject';
      mockProgressTrackerService.getMetrixById.mockResolvedValue(null);

      const result = await controller.getMetrixById(req, subjectId);

      expect(result).toBeNull();
      expect(service.getMetrixById).toHaveBeenCalledWith('user-1', subjectId);
    });
  });

  describe('addMetrix', () => {
    it('should create and return new metric', async () => {
      const req = { user: { sub: 'user-1' } };
      mockProgressTrackerService.addMetrix.mockResolvedValue(mockProgress);

      const result = await controller.addMetrix(req, mockMetrixBody);

      expect(result).toEqual(mockProgress);
      expect(service.addMetrix).toHaveBeenCalledWith('user-1', mockMetrixBody);
    });

    it('should extract userId from request correctly', async () => {
      const req = { user: { sub: 'different-user' } };
      mockProgressTrackerService.addMetrix.mockResolvedValue(mockProgress);

      await controller.addMetrix(req, mockMetrixBody);

      expect(service.addMetrix).toHaveBeenCalledWith(
        'different-user',
        mockMetrixBody,
      );
    });
  });

  describe('updateMetrix', () => {
    it('should update and return metric', async () => {
      const req = { user: { sub: 'user-1' } };
      const subjectId = 'subject-1';
      const updateBody = {
        subject_id: subjectId,
        completed_topics: 15,
        accuracy_rate: 0.9,
        time_spent: 700,
        nextReview: new Date(),
      };
      const updatedProgress = { ...mockProgress, ...updateBody };
      mockProgressTrackerService.updateMetrix.mockResolvedValue(
        updatedProgress,
      );

      const result = await controller.updateMetrix(req, subjectId, updateBody);

      expect(result).toEqual(updatedProgress);
      expect(service.updateMetrix).toHaveBeenCalledWith(
        'user-1',
        subjectId,
        updateBody,
      );
    });
  });

  describe('deleteMetrix', () => {
    it('should delete metric and return confirmation', async () => {
      const req = { user: { sub: 'user-1' } };
      const subjectId = 'subject-1';
      const deleteResponse = {
        message: `Metric with subjectId ${subjectId} was deleted`,
        data: mockProgress,
      };
      mockProgressTrackerService.deleteMetrix.mockResolvedValue(deleteResponse);

      const result = await controller.deleteMetrix(req, subjectId);

      expect(result).toEqual(deleteResponse);
      expect(service.deleteMetrix).toHaveBeenCalledWith('user-1', subjectId);
    });

    it('should extract userId from request correctly', async () => {
      const req = { user: { sub: 'another-user' } };
      const subjectId = 'subject-1';
      mockProgressTrackerService.deleteMetrix.mockResolvedValue({
        message: `Metric with subjectId ${subjectId} was deleted`,
        data: mockProgress,
      });

      await controller.deleteMetrix(req, subjectId);

      expect(service.deleteMetrix).toHaveBeenCalledWith(
        'another-user',
        subjectId,
      );
    });
  });
});
