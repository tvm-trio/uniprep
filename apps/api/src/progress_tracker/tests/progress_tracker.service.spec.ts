import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProgressTrackerService } from '../progress_tracker.service';
import { ERROR_MESSAGES } from '@common/constants';
import {
  mockProgress,
  mockProgressList,
  mockMetrixBody,
  mockPrismaClient,
} from './mocks';

describe('ProgressTrackerService', () => {
  let service: ProgressTrackerService;
  let prisma: PrismaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressTrackerService,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<ProgressTrackerService>(ProgressTrackerService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrix', () => {
    it('should return all metrics', async () => {
      mockPrismaClient.progress.findMany.mockResolvedValue(mockProgressList);

      const result = await service.getMetrix();

      expect(result).toEqual(mockProgressList);
      expect(prisma.progress.findMany).toHaveBeenCalledWith();
      expect(prisma.progress.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no metrics exist', async () => {
      mockPrismaClient.progress.findMany.mockResolvedValue([]);

      const result = await service.getMetrix();

      expect(result).toEqual([]);
      expect(prisma.progress.findMany).toHaveBeenCalledWith();
    });
  });

  describe('getMetrixById', () => {
    it('should return metric for specific user and subject', async () => {
      const userId = 'user-1';
      const subjectId = 'subject-1';
      mockPrismaClient.progress.findUnique.mockResolvedValue(mockProgress);

      const result = await service.getMetrixById(userId, subjectId);

      expect(result).toEqual(mockProgress);
      expect(prisma.progress.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
      });
    });

    it('should return null when metric does not exist', async () => {
      const userId = 'user-1';
      const subjectId = 'nonexistent-subject';
      mockPrismaClient.progress.findUnique.mockResolvedValue(null);

      const result = await service.getMetrixById(userId, subjectId);

      expect(result).toBeNull();
      expect(prisma.progress.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
      });
    });

    it('should use composite key correctly', async () => {
      const userId = 'user-2';
      const subjectId = 'subject-2';
      mockPrismaClient.progress.findUnique.mockResolvedValue(mockProgress);

      await service.getMetrixById(userId, subjectId);

      expect(prisma.progress.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
      });
    });
  });

  describe('addMetrix', () => {
    const userId = 'user-1';

    it('should create and return new metric', async () => {
      mockPrismaClient.progress.findUnique.mockResolvedValue(null);
      mockPrismaClient.progress.create.mockResolvedValue(mockProgress);

      const result = await service.addMetrix(userId, mockMetrixBody);

      expect(result).toEqual(mockProgress);
      expect(prisma.progress.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: mockMetrixBody.subject_id,
          },
        },
      });
      expect(prisma.progress.create).toHaveBeenCalledWith({
        data: { user_id: userId, ...mockMetrixBody },
      });
    });

    it('should throw ForbiddenException when metric already exists', async () => {
      mockPrismaClient.progress.findUnique.mockResolvedValue(mockProgress);

      await expect(service.addMetrix(userId, mockMetrixBody)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.METRIC_ALREADY_EXISTS),
      );

      expect(prisma.progress.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: mockMetrixBody.subject_id,
          },
        },
      });
      expect(prisma.progress.create).not.toHaveBeenCalled();
    });

    it('should create metric with all fields from body', async () => {
      const customBody = {
        subject_id: 'subject-2',
        completed_topics: 20,
        accuracy_rate: 0.95,
        time_spent: 1000,
      };
      mockPrismaClient.progress.findUnique.mockResolvedValue(null);
      mockPrismaClient.progress.create.mockResolvedValue({
        ...mockProgress,
        ...customBody,
      });

      await service.addMetrix(userId, customBody);

      expect(prisma.progress.create).toHaveBeenCalledWith({
        data: { user_id: userId, ...customBody },
      });
    });
  });

  describe('updateMetrix', () => {
    const userId = 'user-1';
    const subjectId = 'subject-1';

    it('should update existing metric using upsert', async () => {
      const updateBody = {
        completed_topics: 15,
        accuracy_rate: 0.9,
        time_spent: 800,
      };
      const updatedProgress = { ...mockProgress, ...updateBody };
      mockPrismaClient.progress.upsert.mockResolvedValue(updatedProgress);

      const result = await service.updateMetrix(userId, subjectId, updateBody);

      expect(result).toEqual(updatedProgress);
      expect(prisma.progress.upsert).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
        update: { user_id: userId, subject_id: subjectId, ...updateBody },
        create: { user_id: userId, subject_id: subjectId, ...updateBody },
      });
    });

    it('should create metric if it does not exist (upsert create)', async () => {
      const createBody = {
        completed_topics: 5,
        accuracy_rate: 0.7,
        time_spent: 200,
      };
      const newProgress = {
        id: 'new-progress',
        user_id: userId,
        subject_id: subjectId,
        ...createBody,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPrismaClient.progress.upsert.mockResolvedValue(newProgress);

      const result = await service.updateMetrix(userId, subjectId, createBody);

      expect(result).toEqual(newProgress);
      expect(prisma.progress.upsert).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
        update: { user_id: userId, subject_id: subjectId, ...createBody },
        create: { user_id: userId, subject_id: subjectId, ...createBody },
      });
    });

    it('should use composite key in upsert', async () => {
      const differentUserId = 'user-2';
      const differentSubjectId = 'subject-2';
      const updateBody = {
        completed_topics: 10,
        accuracy_rate: 0.8,
        time_spent: 500,
      };
      mockPrismaClient.progress.upsert.mockResolvedValue(mockProgress);

      await service.updateMetrix(
        differentUserId,
        differentSubjectId,
        updateBody,
      );

      expect(prisma.progress.upsert).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: differentUserId,
            subject_id: differentSubjectId,
          },
        },
        update: expect.objectContaining({
          user_id: differentUserId,
          subject_id: differentSubjectId,
        }),
        create: expect.objectContaining({
          user_id: differentUserId,
          subject_id: differentSubjectId,
        }),
      });
    });
  });

  describe('deleteMetrix', () => {
    const userId = 'user-1';
    const subjectId = 'subject-1';

    it('should delete metric and return confirmation message', async () => {
      mockPrismaClient.progress.delete.mockResolvedValue(mockProgress);

      const result = await service.deleteMetrix(userId, subjectId);

      expect(result).toEqual({
        message: `Metric with subjectId ${subjectId} was deleted`,
        data: mockProgress,
      });
      expect(prisma.progress.delete).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
      });
    });

    it('should use composite key correctly', async () => {
      mockPrismaClient.progress.delete.mockResolvedValue(mockProgress);

      await service.deleteMetrix(userId, subjectId);

      expect(prisma.progress.delete).toHaveBeenCalledWith({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId,
          },
        },
      });
    });

    it('should include deleted data in response', async () => {
      const deletedProgress = { ...mockProgress, id: 'deleted-progress' };
      mockPrismaClient.progress.delete.mockResolvedValue(deletedProgress);

      const result = await service.deleteMetrix(userId, subjectId);

      expect(result.data).toEqual(deletedProgress);
    });

    it('should handle different subject IDs in message', async () => {
      const differentSubjectId = 'subject-999';
      mockPrismaClient.progress.delete.mockResolvedValue(mockProgress);

      const result = await service.deleteMetrix(userId, differentSubjectId);

      expect(result.message).toBe(
        `Metric with subjectId ${differentSubjectId} was deleted`,
      );
    });

    it('should throw error when metric does not exist', async () => {
      mockPrismaClient.progress.delete.mockRejectedValue(
        new Error('Record not found'),
      );

      await expect(service.deleteMetrix(userId, 'nonexistent')).rejects.toThrow(
        'Record not found',
      );
    });
  });
});
