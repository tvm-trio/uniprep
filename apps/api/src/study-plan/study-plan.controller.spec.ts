import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlanController } from '../study-plan/study-plan.controller';
import { StudyPlanService } from '../study-plan/study-plan.service';
import { ForbiddenException } from '@nestjs/common';

const mockStudyPlanService = {
  createPlan: jest.fn(),
  getAllPlansByUser: jest.fn(),
  getPlanBySubject: jest.fn(),
  updateTopicStatus: jest.fn(),
};

describe('StudyPlanController', () => {
  let controller: StudyPlanController;
  const mockRequest = { user: { sub: 'test-user-id' } };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyPlanController],
      providers: [
        {
          provide: StudyPlanService,
          useValue: mockStudyPlanService,
        },
      ],
    }).compile();

    controller = module.get<StudyPlanController>(StudyPlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createStudyPlan (Generate)', () => {
    it('should call service.createPlan with the full body', async () => {
      const body = {
        userId: 'test-user-id',
        subjectId: 'sub-1',
        results: [{ topicId: 't1', flashcardId: 'f1', answerId: 'a1' }],
      };

      const expectedResponse = {
        message: 'Plan generated',
        topics: ['t1'],
      };

      mockStudyPlanService.createPlan.mockResolvedValue(expectedResponse);

      const result = await controller.createStudyPlan(body);

      expect(mockStudyPlanService.createPlan).toHaveBeenCalledWith(body);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getAllMyPlans', () => {
    it('should call service.getAllPlansByUser with userId', async () => {
      mockStudyPlanService.getAllPlansByUser.mockResolvedValue([]);
      await controller.getAllMyPlans(mockRequest);
      expect(mockStudyPlanService.getAllPlansByUser).toHaveBeenCalledWith(
        'test-user-id',
      );
    });
  });

  describe('getPlanBySubject', () => {
    it('should call service.getPlanBySubject with extracted userId', async () => {
      const subjectId = 'subject-abc';
      mockStudyPlanService.getPlanBySubject.mockResolvedValue({});

      await controller.getPlanBySubject(subjectId, mockRequest as any);

      expect(mockStudyPlanService.getPlanBySubject).toHaveBeenCalledWith(
        'test-user-id',
        subjectId,
      );
    });
  });

  describe('updateTopicStatus', () => {
    it('should call service.updateTopicStatus', async () => {
      const topicId = 'topic-1';
      const statusDto = { status: 'COMPLETED' };
      mockStudyPlanService.updateTopicStatus.mockResolvedValue({
        id: topicId,
        status: 'COMPLETED',
      });

      const result = await controller.updateTopicStatus(
        topicId,
        statusDto as any,
        mockRequest as any,
      );

      expect(mockStudyPlanService.updateTopicStatus).toHaveBeenCalledWith(
        'test-user-id',
        topicId,
        'COMPLETED',
      );
      expect(result.data.status).toBe('COMPLETED');
    });

    it('should throw ForbiddenException if service throws', async () => {
      mockStudyPlanService.updateTopicStatus.mockRejectedValue(
        new ForbiddenException('Denied'),
      );

      await expect(
        controller.updateTopicStatus(
          'topic-1',
          { status: 'COMPLETED' } as any,
          mockRequest as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
