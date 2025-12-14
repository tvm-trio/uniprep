import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FlashcardsService } from '../flashcards.service';
import { PrismaService } from '@common/prisma';
import { DEFAULT_CARDS_TAKE, ENTRY_TEST_CARDS_NUMBER } from '../constants';
import { calculateSM2 } from '../utils';
import { ERROR_MESSAGES } from '@common/constants';
import {
  mockCorrectAnswerBody,
  mockFlashcards,
  mockIncorrectAnswerBody,
  mockSubjectId,
  mockTopicId,
} from './mocks';

jest.mock('../utils');

describe('FlashcardsService', () => {
  let service: FlashcardsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    flashcard: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlashcardsService>(FlashcardsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFlashcardsByTopic', () => {
    it('should return flashcards for a given topic with default pagination', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getFlashcardsByTopic(mockTopicId);

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: { topic_id: mockTopicId },
        include: { answers: true },
        skip: 0,
        take: DEFAULT_CARDS_TAKE,
      });
      expect(result).toEqual(mockFlashcards);
    });

    it('should return flashcards with custom skip and take values', async () => {
      const skip = 10;
      const take = 20;

      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getFlashcardsByTopic(
        mockTopicId,
        skip,
        take,
      );

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: { topic_id: mockTopicId },
        include: { answers: true },
        skip,
        take,
      });
      expect(result).toEqual(mockFlashcards);
    });
  });

  describe('getEntryTestFlashcards', () => {
    it('should return shuffled flashcards without subject filter', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const mockMath = Object.create(global.Math);
      mockMath.random = jest.fn(() => 0.5);
      global.Math = mockMath;

      const result = await service.getEntryTestFlashcards();

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {},
        include: { answers: true },
      });
      expect(result).toHaveLength(ENTRY_TEST_CARDS_NUMBER);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return all flashcards when less than ENTRY_TEST_CARDS_NUMBER available', async () => {
      const shortenedFlashcards = mockFlashcards.slice(
        0,
        ENTRY_TEST_CARDS_NUMBER / 2,
      );

      mockPrismaService.flashcard.findMany.mockResolvedValue(
        shortenedFlashcards,
      );

      const result = await service.getEntryTestFlashcards();

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {},
        include: { answers: true },
      });
      expect(result).toHaveLength(shortenedFlashcards.length);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return shuffled flashcards with subject filter', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getEntryTestFlashcards(mockSubjectId);

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          Topic: {
            subject_id: mockSubjectId,
          },
        },
        include: { answers: true },
      });
      expect(result).toHaveLength(ENTRY_TEST_CARDS_NUMBER);
    });

    it('should apply skip and take to shuffled results', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const skip = 5;
      const take = 10;
      const result = await service.getEntryTestFlashcards(
        undefined,
        skip,
        take,
      );

      expect(result).toHaveLength(take);
      expect(result.length).toBeLessThanOrEqual(take);
    });
  });

  describe('submitAnswer', () => {
    const mockFlashcard = {
      id: 'flashcard-123',
      ef: 2.5,
      interval: 1,
      repetitions: 0,
    };

    it('should update flashcard with correct answer', async () => {
      const mockUpdatedData = {
        ef: 2.6,
        interval: 6,
        repetitions: 1,
        nextReview: new Date(),
      };

      const mockUpdatedFlashcard = { ...mockFlashcard, ...mockUpdatedData };

      mockPrismaService.flashcard.findUnique.mockResolvedValue(mockFlashcard);
      (calculateSM2 as jest.Mock).mockReturnValue(mockUpdatedData);
      mockPrismaService.flashcard.update.mockResolvedValue(
        mockUpdatedFlashcard,
      );

      const result = await service.submitAnswer(mockCorrectAnswerBody);

      expect(prisma.flashcard.findUnique).toHaveBeenCalledWith({
        where: { id: mockCorrectAnswerBody.flashcardId },
      });
      expect(calculateSM2).toHaveBeenCalledWith(mockFlashcard, true);
      expect(prisma.flashcard.update).toHaveBeenCalledWith({
        where: { id: mockCorrectAnswerBody.flashcardId },
        data: mockUpdatedData,
      });
      expect(result).toEqual(mockUpdatedFlashcard);
    });

    it('should update flashcard with incorrect answer', async () => {
      const mockUpdatedData = {
        ef: 2.3,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
      };

      const mockUpdatedFlashcard = { ...mockFlashcard, ...mockUpdatedData };

      mockPrismaService.flashcard.findUnique.mockResolvedValue(mockFlashcard);
      (calculateSM2 as jest.Mock).mockReturnValue(mockUpdatedData);
      mockPrismaService.flashcard.update.mockResolvedValue(
        mockUpdatedFlashcard,
      );

      const result = await service.submitAnswer(mockIncorrectAnswerBody);

      expect(prisma.flashcard.findUnique).toHaveBeenCalledWith({
        where: { id: mockIncorrectAnswerBody.flashcardId },
      });
      expect(calculateSM2).toHaveBeenCalledWith(mockFlashcard, false);
      expect(prisma.flashcard.update).toHaveBeenCalledWith({
        where: { id: mockIncorrectAnswerBody.flashcardId },
        data: mockUpdatedData,
      });
      expect(result).toEqual(mockUpdatedFlashcard);
    });

    it('should throw NotFoundException when flashcard does not exist', async () => {
      mockPrismaService.flashcard.findUnique.mockResolvedValue(null);

      await expect(service.submitAnswer(mockCorrectAnswerBody)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.FLASHCARD_NOT_FOUND),
      );

      expect(prisma.flashcard.findUnique).toHaveBeenCalledWith({
        where: { id: mockCorrectAnswerBody.flashcardId },
      });
      expect(calculateSM2).not.toHaveBeenCalled();
      expect(prisma.flashcard.update).not.toHaveBeenCalled();
    });
  });

  describe('getFlashcardsToRepeat', () => {
    it('should return flashcards due for review without topic filter', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getFlashcardsToRepeat();

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          topic_id: undefined,
          nextReview: { lte: expect.any(Date) },
        },
        include: { answers: true },
        skip: 0,
        take: DEFAULT_CARDS_TAKE,
        orderBy: { nextReview: 'asc' },
      });
      expect(result).toEqual(mockFlashcards);
    });

    it('should return flashcards due for review with topic filter', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue(mockFlashcards);

      const result = await service.getFlashcardsToRepeat(mockTopicId);

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          topic_id: mockTopicId,
          nextReview: { lte: expect.any(Date) },
        },
        include: { answers: true },
        skip: 0,
        take: DEFAULT_CARDS_TAKE,
        orderBy: { nextReview: 'asc' },
      });
      expect(result).toEqual(mockFlashcards);
    });

    it('should apply custom pagination parameters', async () => {
      const skip = 10;
      const take = 25;

      mockPrismaService.flashcard.findMany.mockResolvedValue([]);

      await service.getFlashcardsToRepeat(mockTopicId, skip, take);

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith({
        where: {
          topic_id: mockTopicId,
          nextReview: { lte: expect.any(Date) },
        },
        include: { answers: true },
        skip,
        take,
        orderBy: { nextReview: 'asc' },
      });
    });

    it('should return empty array when no flashcards are due', async () => {
      mockPrismaService.flashcard.findMany.mockResolvedValue([]);

      const result = await service.getFlashcardsToRepeat();

      expect(result).toEqual([]);
    });
  });
});
