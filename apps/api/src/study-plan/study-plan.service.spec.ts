import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlanService } from './study-plan.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicStatus } from './dto/update-topic-status.dto';
import * as gptFuncs from './gpt_settings/gptReqFunc';

jest.mock('./gpt_settings/gptReqFunc');

describe('StudyPlanService', () => {
  let service: StudyPlanService;
  let prisma: PrismaService;

  const mockPrismaService = {
    answer: {
      findMany: jest.fn(),
    },
    studyPlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    planTopic: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyPlanService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StudyPlanService>(StudyPlanService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlan (AI Flow)', () => {
    const params = {
      userId: 'user-uuid',
      subjectId: 'subject-uuid',
      results: [
        { topicId: 't1', flashcardId: 'f1', answerId: 'a1' },
        { topicId: 't1', flashcardId: 'f2', answerId: 'a2' },
      ],
    };

    it('should analyze wrong answers, call AI, and save plan', async () => {
      const mockAnswers = [
        {
          id: 'a1',
          isCorrect: false,
          Flashcard: { Topic: { id: 't1', name: 'Weak Topic' } },
        },
        {
          id: 'a2',
          isCorrect: true,
          Flashcard: { Topic: { id: 't1', name: 'Weak Topic' } },
        },
      ];
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      (gptFuncs.supportMsg as jest.Mock).mockResolvedValue({
        output_text: JSON.stringify({ message: 'Good job!' }),
      });
      (gptFuncs.analiseAnswers as jest.Mock).mockResolvedValue({
        output_text: {
          ids: JSON.stringify([{ topicId: 't1', topic: 'Weak Topic' }]),
        },
      });

      (prisma.studyPlan.create as jest.Mock).mockResolvedValue({
        id: 'new-plan-id',
        user_id: params.userId,
        topic_ids: ['t1'],
      });

      const result = await service.createPlan(params);

      expect(prisma.answer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['a1', 'a2'] } },
        }),
      );

      expect(gptFuncs.supportMsg).toHaveBeenCalledWith({
        taskNum: 2,
        correctTaskNum: 1,
      });
      expect(gptFuncs.analiseAnswers).toHaveBeenCalled();

      expect(prisma.studyPlan.create).toHaveBeenCalledWith({
        data: {
          user_id: params.userId,
          subject_id: params.subjectId,
          topic_ids: ['t1'],
        },
      });

      expect(result).toEqual({
        message: 'Good job!',
        topics: ['t1'],
      });
    });

    it('should handle empty wrong answers gracefully', async () => {
      const mockAnswers = [
        {
          id: 'a1',
          isCorrect: true,
          Flashcard: { Topic: { id: 't1', name: 'Topic' } },
        },
      ];
      (prisma.answer.findMany as jest.Mock).mockResolvedValue(mockAnswers);

      (gptFuncs.supportMsg as jest.Mock).mockResolvedValue({
        output_text: JSON.stringify({ message: 'Perfect!' }),
      });

      const result = await service.createPlan(params);

      expect(gptFuncs.analiseAnswers).not.toHaveBeenCalled();
      expect(prisma.studyPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ topic_ids: [] }),
      });
      expect(result.topics).toEqual([]);
    });
  });

  describe('updateTopicStatus', () => {
    const userId = 'user-uuid';
    const topicId = 'topic-1';
    const newStatus = TopicStatus.COMPLETED;

    it('should update status if topic exists and user is owner', async () => {
      (prisma.planTopic.findUnique as jest.Mock).mockResolvedValue({
        id: topicId,
        StudyPlan: { user_id: userId },
      });

      (prisma.planTopic.update as jest.Mock).mockResolvedValue({
        id: topicId,
        status: newStatus,
      });

      await service.updateTopicStatus(userId, topicId, newStatus);

      expect(prisma.planTopic.update).toHaveBeenCalledWith({
        where: { id: topicId },
        data: { status: newStatus },
      });
    });

    it('should throw ForbiddenException if user is NOT the owner', async () => {
      (prisma.planTopic.findUnique as jest.Mock).mockResolvedValue({
        id: topicId,
        StudyPlan: { user_id: 'other-user' },
      });

      await expect(
        service.updateTopicStatus(userId, topicId, newStatus),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if topic does not exist', async () => {
      (prisma.planTopic.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateTopicStatus(userId, topicId, newStatus),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Get Plans', () => {
    it('getAllPlansByUser should return plans', async () => {
      (prisma.studyPlan.findMany as jest.Mock).mockResolvedValue(['plan1']);
      const result = await service.getAllPlansByUser('u1');
      expect(result).toEqual(['plan1']);
    });

    it('getPlanBySubject should throw NotFound if not found', async () => {
      (prisma.studyPlan.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getPlanBySubject('u1', 's1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
