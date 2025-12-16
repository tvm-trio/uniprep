import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FlashcardsService } from '../flashcards.service';
import { PrismaService } from '@common/prisma';
import { ProgressTrackerService } from '../../progress_tracker/progress_tracker.service';
import { ERROR_MESSAGES } from '@common/constants';
import { DEFAULT_CARDS_TAKE } from '../constants';
import * as utils from '../utils';
import {
  mockFlashcard,
  mockFlashcardWithTopic,
  mockUserFlashcardProgress,
  mockProgressMetric,
  mockPrismaService,
  mockProgressTrackerService,
} from './mocks';

jest.mock('../utils');

describe('FlashcardsService', () => {
  let service: FlashcardsService;
  let prisma: PrismaService;
  let progressTracker: ProgressTrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProgressTrackerService,
          useValue: mockProgressTrackerService,
        },
      ],
    }).compile();

    service = module.get<FlashcardsService>(FlashcardsService);
    prisma = module.get<PrismaService>(PrismaService);
    progressTracker = module.get<ProgressTrackerService>(
      ProgressTrackerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFlashcardsByTopic', () => {
    it('should return flashcards for a given topic', async () => {
      const topicId = 'topic-1';
      const expectedResult = [mockFlashcard];
      mockPrismaService.flashcard.findMany.mockResolvedValue(expectedResult);

      const result = await service.getFlashcardsByTopic(topicId);

      expect(result).toEqual(expectedResult);
      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: { topic_id: topicId },
        include: { answers: true },
        skip: 0,
        take: DEFAULT_CARDS_TAKE,
      });
    });

    it('should apply pagination parameters', async () => {
      const topicId = 'topic-1';
      const skip = 10;
      const take = 5;
      mockPrismaService.flashcard.findMany.mockResolvedValue([]);

      await service.getFlashcardsByTopic(topicId, skip, take);

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: { topic_id: topicId },
        include: { answers: true },
        skip,
        take,
      });
    });
  });

  describe('getEntryTestFlashcards', () => {
    it('should return shuffled flashcards without subject filter', async () => {
      const flashcards = [
        mockFlashcard,
        { ...mockFlashcard, id: 'flashcard-2' },
      ];
      mockPrismaService.flashcard.findMany.mockResolvedValue(flashcards);

      const result = await service.getEntryTestFlashcards();

      expect(result).toHaveLength(2);
      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {},
        include: { answers: true },
      });
    });

    it('should filter by subject when provided', async () => {
      const subjectId = 'subject-1';
      const flashcards = [mockFlashcard];
      mockPrismaService.flashcard.findMany.mockResolvedValue(flashcards);

      await service.getEntryTestFlashcards(subjectId);

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          Topic: {
            subject_id: subjectId,
          },
        },
        include: { answers: true },
      });
    });

    it('should apply pagination to shuffled results', async () => {
      const flashcards = Array.from({ length: 20 }, (_, i) => ({
        ...mockFlashcard,
        id: `flashcard-${i}`,
      }));
      mockPrismaService.flashcard.findMany.mockResolvedValue(flashcards);

      const result = await service.getEntryTestFlashcards(undefined, 5, 10);

      expect(result).toHaveLength(10);
    });
  });

  describe('submitAnswer', () => {
    const userId = 'user-1';
    const submitBody = {
      flashcardId: 'flashcard-1',
      isCorrect: true,
      timeSpent: 30,
    };

    it('should throw NotFoundException when flashcard does not exist', async () => {
      mockPrismaService.flashcard.findUnique.mockResolvedValue(null);

      await expect(service.submitAnswer(submitBody, userId)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.FLASHCARD_NOT_FOUND),
      );
    });

    it('should create new progress for first-time answer', async () => {
      mockPrismaService.flashcard.findUnique.mockResolvedValue(
        mockFlashcardWithTopic,
      );
      mockPrismaService.userFlashcardProgress.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.userFlashcardProgress.upsert.mockResolvedValue(
        mockUserFlashcardProgress,
      );
      mockProgressTrackerService.getMetrixById.mockResolvedValue(null);
      (utils.calculateSM2 as jest.Mock).mockReturnValue({});

      const result = await service.submitAnswer(submitBody, userId);

      expect(result).toEqual(mockUserFlashcardProgress);
      expect(prisma.userFlashcardProgress.upsert).toHaveBeenCalledWith({
        where: {
          user_id_flashcard_id: {
            user_id: userId,
            flashcard_id: submitBody.flashcardId,
          },
        },
        update: { time_spent: 30 },
        create: {
          user_id: userId,
          flashcard_id: submitBody.flashcardId,
          time_spent: 30,
        },
      });
    });

    it('should update existing progress with SM2 metrics', async () => {
      const sm2Result = {
        interval: 2,
        repetition: 2,
        ef: 2.6,
        nextReview: new Date(),
      };
      mockPrismaService.flashcard.findUnique.mockResolvedValue(
        mockFlashcardWithTopic,
      );
      mockPrismaService.userFlashcardProgress.findUnique.mockResolvedValue(
        mockUserFlashcardProgress,
      );
      mockPrismaService.userFlashcardProgress.upsert.mockResolvedValue({
        ...mockUserFlashcardProgress,
        ...sm2Result,
      });
      mockProgressTrackerService.getMetrixById.mockResolvedValue(
        mockProgressMetric,
      );
      (utils.calculateSM2 as jest.Mock).mockReturnValue(sm2Result);

      await service.submitAnswer(submitBody, userId);

      expect(utils.calculateSM2).toHaveBeenCalledWith(
        mockUserFlashcardProgress,
        true,
      );
      expect(prisma.userFlashcardProgress.upsert).toHaveBeenCalledWith({
        where: {
          user_id_flashcard_id: {
            user_id: userId,
            flashcard_id: submitBody.flashcardId,
          },
        },
        update: { ...sm2Result, time_spent: 60 },
        create: {
          user_id: userId,
          flashcard_id: submitBody.flashcardId,
          time_spent: 60,
        },
      });
    });

    it('should update progress metrics correctly', async () => {
      mockPrismaService.flashcard.findUnique.mockResolvedValue(
        mockFlashcardWithTopic,
      );
      mockPrismaService.userFlashcardProgress.findUnique.mockResolvedValue(
        mockUserFlashcardProgress,
      );
      mockPrismaService.userFlashcardProgress.upsert.mockResolvedValue(
        mockUserFlashcardProgress,
      );
      mockProgressTrackerService.getMetrixById.mockResolvedValue(
        mockProgressMetric,
      );
      (utils.calculateSM2 as jest.Mock).mockReturnValue({});

      await service.submitAnswer(submitBody, userId);

      const expectedAccuracy = (0.8 * 5 + 1) / 6;
      expect(progressTracker.updateMetrix).toHaveBeenCalledWith(
        userId,
        'subject-1',
        {
          completed_topics: 6,
          accuracy_rate: expectedAccuracy,
          time_spent: 330,
        },
      );
    });

    it('should handle incorrect answers in accuracy calculation', async () => {
      const incorrectBody = { ...submitBody, isCorrect: false };
      mockPrismaService.flashcard.findUnique.mockResolvedValue(
        mockFlashcardWithTopic,
      );
      mockPrismaService.userFlashcardProgress.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.userFlashcardProgress.upsert.mockResolvedValue(
        mockUserFlashcardProgress,
      );
      mockProgressTrackerService.getMetrixById.mockResolvedValue(
        mockProgressMetric,
      );
      (utils.calculateSM2 as jest.Mock).mockReturnValue({});

      await service.submitAnswer(incorrectBody, userId);

      const expectedAccuracy = (0.8 * 5 + 0) / 6;
      expect(progressTracker.updateMetrix).toHaveBeenCalledWith(
        userId,
        'subject-1',
        expect.objectContaining({
          accuracy_rate: expectedAccuracy,
        }),
      );
    });

    it('should initialize progress metrics when none exist', async () => {
      mockPrismaService.flashcard.findUnique.mockResolvedValue(
        mockFlashcardWithTopic,
      );
      mockPrismaService.userFlashcardProgress.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.userFlashcardProgress.upsert.mockResolvedValue(
        mockUserFlashcardProgress,
      );
      mockProgressTrackerService.getMetrixById.mockResolvedValue(null);
      (utils.calculateSM2 as jest.Mock).mockReturnValue({});

      await service.submitAnswer(submitBody, userId);

      expect(progressTracker.updateMetrix).toHaveBeenCalledWith(
        userId,
        'subject-1',
        {
          completed_topics: 1,
          accuracy_rate: 1,
          time_spent: 30,
        },
      );
    });
  });

  describe('getFlashcardsToRepeat', () => {
    const userId = 'user-1';

    it('should return flashcards due for review', async () => {
      const progresses = [
        {
          ...mockUserFlashcardProgress,
          Flashcard: mockFlashcard,
        },
      ];
      mockPrismaService.userFlashcardProgress.findMany.mockResolvedValue(
        progresses,
      );

      const result = await service.getFlashcardsToRepeat(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockFlashcard,
        interval: mockUserFlashcardProgress.interval,
        repetition: mockUserFlashcardProgress.repetition,
        ef: mockUserFlashcardProgress.ef,
        nextReview: mockUserFlashcardProgress.nextReview,
      });
      expect(prisma.userFlashcardProgress.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          Flashcard: undefined,
          nextReview: { lte: expect.any(Date) },
        },
        include: { Flashcard: { include: { answers: true } } },
        skip: 0,
        take: DEFAULT_CARDS_TAKE,
        orderBy: { nextReview: 'asc' },
      });
    });

    it('should filter by topic when provided', async () => {
      const topicId = 'topic-1';
      mockPrismaService.userFlashcardProgress.findMany.mockResolvedValue([]);

      await service.getFlashcardsToRepeat(userId, topicId);

      expect(prisma.userFlashcardProgress.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          Flashcard: { topic_id: topicId },
          nextReview: { lte: expect.any(Date) },
        },
        include: { Flashcard: { include: { answers: true } } },
        skip: 0,
        take: DEFAULT_CARDS_TAKE,
        orderBy: { nextReview: 'asc' },
      });
    });

    it('should apply pagination parameters', async () => {
      const skip = 5;
      const take = 10;
      mockPrismaService.userFlashcardProgress.findMany.mockResolvedValue([]);

      await service.getFlashcardsToRepeat(userId, undefined, skip, take);

      expect(prisma.userFlashcardProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip,
          take,
        }),
      );
    });

    it('should order results by nextReview ascending', async () => {
      mockPrismaService.userFlashcardProgress.findMany.mockResolvedValue([]);

      await service.getFlashcardsToRepeat(userId);

      expect(prisma.userFlashcardProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { nextReview: 'asc' },
        }),
      );
    });
  });
});
