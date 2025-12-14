import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardsController } from '../flashcards.controller';
import { FlashcardsService } from '../flashcards.service';
import { DEFAULT_CARDS_TAKE, ENTRY_TEST_CARDS_NUMBER } from '../constants';
import {
  mockCorrectAnswerBody,
  mockFlashcards,
  mockIncorrectAnswerBody,
  mockSubjectId,
  mockTopicId,
  mockUpdatedFlashcard,
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
    it('should call service with correct parameters and default values', () => {
      mockFlashcardsService.getFlashcardsByTopic.mockReturnValue(
        mockFlashcards,
      );

      const result = controller.getFlashcardsByTopic(mockTopicId);

      expect(service.getFlashcardsByTopic).toHaveBeenCalledWith(
        mockTopicId,
        0,
        DEFAULT_CARDS_TAKE,
      );
      expect(result).toEqual(mockFlashcards);
    });

    it('should call service with custom skip and take values', () => {
      const skip = 10;
      const take = 20;

      mockFlashcardsService.getFlashcardsByTopic.mockReturnValue(
        mockFlashcards,
      );

      const result = controller.getFlashcardsByTopic(mockTopicId, skip, take);

      expect(service.getFlashcardsByTopic).toHaveBeenCalledWith(
        mockTopicId,
        skip,
        take,
      );
      expect(result).toEqual(mockFlashcards);
    });
  });

  describe('getEntryTestFlashcards', () => {
    it('should call service without mockSubjectId when not provided', async () => {
      mockFlashcardsService.getEntryTestFlashcards.mockResolvedValue(
        mockFlashcards,
      );

      const result = await controller.getEntryTestFlashcards();

      expect(service.getEntryTestFlashcards).toHaveBeenCalledWith(
        undefined,
        0,
        ENTRY_TEST_CARDS_NUMBER,
      );
      expect(result).toEqual(mockFlashcards);
    });

    it('should call service with mockSubjectId when provided', async () => {
      mockFlashcardsService.getEntryTestFlashcards.mockResolvedValue(
        mockFlashcards,
      );

      const result = await controller.getEntryTestFlashcards(mockSubjectId);

      expect(service.getEntryTestFlashcards).toHaveBeenCalledWith(
        mockSubjectId,
        0,
        ENTRY_TEST_CARDS_NUMBER,
      );
      expect(result).toEqual(mockFlashcards);
    });

    it('should call service with custom skip and take values', async () => {
      const skip = 5;
      const take = 15;

      mockFlashcardsService.getEntryTestFlashcards.mockResolvedValue([]);

      await controller.getEntryTestFlashcards(mockSubjectId, skip, take);

      expect(service.getEntryTestFlashcards).toHaveBeenCalledWith(
        mockSubjectId,
        skip,
        take,
      );
    });
  });

  describe('submitAnswer', () => {
    it('should call service with correct body', () => {
      mockFlashcardsService.submitAnswer.mockReturnValue(mockUpdatedFlashcard);

      const result = controller.submitAnswer(mockCorrectAnswerBody);

      expect(service.submitAnswer).toHaveBeenCalledWith(mockCorrectAnswerBody);
      expect(result).toEqual(mockUpdatedFlashcard);
    });

    it('should handle incorrect answer', () => {
      mockFlashcardsService.submitAnswer.mockReturnValue({});

      void controller.submitAnswer(mockIncorrectAnswerBody);

      expect(service.submitAnswer).toHaveBeenCalledWith(
        mockIncorrectAnswerBody,
      );
    });
  });

  describe('getFlashcardsToRepeat', () => {
    it('should call service without mockTopicId when not provided', async () => {
      mockFlashcardsService.getFlashcardsToRepeat.mockResolvedValue(
        mockFlashcards,
      );

      const result = await controller.getFlashcardsToRepeat();

      expect(service.getFlashcardsToRepeat).toHaveBeenCalledWith(
        undefined,
        0,
        DEFAULT_CARDS_TAKE,
      );
      expect(result).toEqual(mockFlashcards);
    });

    it('should call service with mockTopicId when provided', async () => {
      mockFlashcardsService.getFlashcardsToRepeat.mockResolvedValue(
        mockFlashcards,
      );

      const result = await controller.getFlashcardsToRepeat(mockTopicId);

      expect(service.getFlashcardsToRepeat).toHaveBeenCalledWith(
        mockTopicId,
        0,
        DEFAULT_CARDS_TAKE,
      );
      expect(result).toEqual(mockFlashcards);
    });

    it('should call service with custom skip and take values', async () => {
      const skip = 10;
      const take = 30;

      mockFlashcardsService.getFlashcardsToRepeat.mockResolvedValue([]);

      await controller.getFlashcardsToRepeat(mockTopicId, skip, take);

      expect(service.getFlashcardsToRepeat).toHaveBeenCalledWith(
        mockTopicId,
        skip,
        take,
      );
    });
  });
});
