import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardsController } from '../flashcards.controller';
import { FlashcardsService } from '../flashcards.service';
import { DEFAULT_CARDS_TAKE, ENTRY_TEST_CARDS_NUMBER } from '../constants';
import {
  mockFlashcard,
  mockUserFlashcardProgress,
} from './mocks';

describe('FlashcardsController', () => {
  let controller: FlashcardsController;
  let service: FlashcardsService;

  const mockFlashcardsService = {
    getFlashcardsByTopic: jest.fn(),
    getEntryTestFlashcards: jest.fn(),
    submitAnswer: jest.fn(),
    getFlashcardsToRepeat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlashcardsController],
      providers: [
        {
          provide: FlashcardsService,
          useValue: mockFlashcardsService,
        },
      ],
    }).compile();

    controller = module.get<FlashcardsController>(FlashcardsController);
    service = module.get<FlashcardsService>(FlashcardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFlashcardsByTopic', () => {
    it('should return flashcards for a given topic', async () => {
      const topicId = 'topic-1';
      const expectedResult = [mockFlashcard];
      mockFlashcardsService.getFlashcardsByTopic.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getFlashcardsByTopic(topicId);

      expect(result).toEqual(expectedResult);
      expect(service.getFlashcardsByTopic).toHaveBeenCalledWith(
        topicId,
        0,
        DEFAULT_CARDS_TAKE,
      );
    });

    it('should accept custom skip and take parameters', async () => {
      const topicId = 'topic-1';
      const skip = 10;
      const take = 5;
      mockFlashcardsService.getFlashcardsByTopic.mockResolvedValue([]);

      await controller.getFlashcardsByTopic(topicId, skip, take);

      expect(service.getFlashcardsByTopic).toHaveBeenCalledWith(
        topicId,
        skip,
        take,
      );
    });
  });

  describe('getEntryTestFlashcards', () => {
    it('should return entry test flashcards without subject filter', async () => {
      const expectedResult = [mockFlashcard];
      mockFlashcardsService.getEntryTestFlashcards.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getEntryTestFlashcards();

      expect(result).toEqual(expectedResult);
      expect(service.getEntryTestFlashcards).toHaveBeenCalledWith(
        undefined,
        0,
        ENTRY_TEST_CARDS_NUMBER,
      );
    });

    it('should return entry test flashcards filtered by subject', async () => {
      const subjectId = 'subject-1';
      const expectedResult = [mockFlashcard];
      mockFlashcardsService.getEntryTestFlashcards.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getEntryTestFlashcards(subjectId);

      expect(result).toEqual(expectedResult);
      expect(service.getEntryTestFlashcards).toHaveBeenCalledWith(
        subjectId,
        0,
        ENTRY_TEST_CARDS_NUMBER,
      );
    });

    it('should accept custom skip and take parameters', async () => {
      const skip = 5;
      const take = 10;
      mockFlashcardsService.getEntryTestFlashcards.mockResolvedValue([]);

      await controller.getEntryTestFlashcards(undefined, skip, take);

      expect(service.getEntryTestFlashcards).toHaveBeenCalledWith(
        undefined,
        skip,
        take,
      );
    });
  });

  describe('submitAnswer', () => {
    it('should submit an answer and return user progress', async () => {
      const req = { user: { sub: 'user-1' } };
      const body = {
        flashcardId: 'flashcard-1',
        isCorrect: true,
        timeSpent: 30,
      };
      mockFlashcardsService.submitAnswer.mockResolvedValue(
        mockUserFlashcardProgress,
      );

      const result = await controller.submitAnswer(req, body);

      expect(result).toEqual(mockUserFlashcardProgress);
      expect(service.submitAnswer).toHaveBeenCalledWith(body, 'user-1');
    });
  });

  describe('getFlashcardsToRepeat', () => {
    it('should return flashcards to repeat without topic filter', async () => {
      const req = { user: { sub: 'user-1' } };
      const expectedResult = [mockFlashcard];
      mockFlashcardsService.getFlashcardsToRepeat.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getFlashcardsToRepeat(req);

      expect(result).toEqual(expectedResult);
      expect(service.getFlashcardsToRepeat).toHaveBeenCalledWith(
        'user-1',
        undefined,
        0,
        DEFAULT_CARDS_TAKE,
      );
    });

    it('should return flashcards to repeat filtered by topic', async () => {
      const req = { user: { sub: 'user-1' } };
      const topicId = 'topic-1';
      const expectedResult = [mockFlashcard];
      mockFlashcardsService.getFlashcardsToRepeat.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getFlashcardsToRepeat(req, topicId);

      expect(result).toEqual(expectedResult);
      expect(service.getFlashcardsToRepeat).toHaveBeenCalledWith(
        'user-1',
        topicId,
        0,
        DEFAULT_CARDS_TAKE,
      );
    });

    it('should accept custom skip and take parameters', async () => {
      const req = { user: { sub: 'user-1' } };
      const skip = 10;
      const take = 20;
      mockFlashcardsService.getFlashcardsToRepeat.mockResolvedValue([]);

      await controller.getFlashcardsToRepeat(req, undefined, skip, take);

      expect(service.getFlashcardsToRepeat).toHaveBeenCalledWith(
        'user-1',
        undefined,
        skip,
        take,
      );
    });
  });
});
