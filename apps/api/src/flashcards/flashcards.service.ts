import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { DEFAULT_CARDS_TAKE, ENTRY_TEST_CARDS_NUMBER } from './constants';
import { calculateSM2 } from './utils';
import { ERROR_MESSAGES } from '@common/constants';
import { SubmitAnswerBody } from './interfaces';

@Injectable()
export class FlashcardsService {
  constructor(private prisma: PrismaService) {}

  async getFlashcardsByTopic(
    topic_id: string,
    skip: number = 0,
    take: number = DEFAULT_CARDS_TAKE,
  ) {
    return this.prisma.flashcard.findMany({
      where: { topic_id },
      include: { answers: true },
      skip,
      take,
    });
  }

  async getEntryTestFlashcards(
    subjectId?: string,
    skip: number = 0,
    take: number = ENTRY_TEST_CARDS_NUMBER,
  ) {
    let where = {};

    if (subjectId) {
      where = {
        Topic: {
          subject_id: subjectId,
        },
      };
    }

    const flashcards = await this.prisma.flashcard.findMany({
      where,
      include: { answers: true },
    });

    const shuffled = flashcards.sort(() => Math.random() - 0.5);

    return shuffled.slice(skip, skip + take);
  }

  async submitAnswer(body: SubmitAnswerBody) {
    const { flashcardId, isCorrect } = body;

    const flashcard = await this.prisma.flashcard.findUnique({
      where: { id: flashcardId },
    });

    if (!flashcard)
      throw new NotFoundException(ERROR_MESSAGES.FLASHCARD_NOT_FOUND);

    const updated = calculateSM2(flashcard, isCorrect);

    const updatedCard = await this.prisma.flashcard.update({
      where: { id: flashcardId },
      data: updated,
    });

    return updatedCard;
  }

  async getFlashcardsToRepeat(
    topicId?: string,
    skip: number = 0,
    take: number = DEFAULT_CARDS_TAKE,
  ) {
    const today = new Date();

    const flashcards = await this.prisma.flashcard.findMany({
      where: {
        topic_id: topicId,
        nextReview: { lte: today },
      },
      include: { answers: true },
      skip,
      take,
      orderBy: { nextReview: 'asc' },
    });

    return flashcards;
  }
}
