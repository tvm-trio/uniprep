import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { DEFAULT_CARDS_TAKE, ENTRY_TEST_CARDS_NUMBER } from './constants';
import { calculateSM2 } from './utils';
import { ERROR_MESSAGES } from '@common/constants';
import { SubmitAnswerBody } from './interfaces';
import { ProgressTrackerService } from '../progress_tracker/progress_tracker.service';

@Injectable()
export class FlashcardsService {
  constructor(
    private prisma: PrismaService,
    private progress_tracker: ProgressTrackerService,
  ) {}

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

  async submitAnswer(body: SubmitAnswerBody, userId: string) {
    const { flashcardId, isCorrect, timeSpent } = body;

    const flashcard = await this.prisma.flashcard.findUnique({
      include: { Topic: true },
      where: { id: flashcardId },
    });

    if (!flashcard)
      throw new NotFoundException(ERROR_MESSAGES.FLASHCARD_NOT_FOUND);

    const currentProgress = await this.prisma.userFlashcardProgress.findUnique({
      where: {
        user_id_flashcard_id: { user_id: userId, flashcard_id: flashcardId },
      },
    });

    const updatedSm2Metrix = currentProgress
      ? calculateSM2(currentProgress, isCorrect)
      : {};

    const updatedTimeSpent = (currentProgress?.time_spent || 0) + timeSpent;

    const userProgress = await this.prisma.userFlashcardProgress.upsert({
      where: {
        user_id_flashcard_id: { user_id: userId, flashcard_id: flashcardId },
      },
      update: { ...updatedSm2Metrix, time_spent: updatedTimeSpent },
      create: {
        user_id: userId,
        flashcard_id: flashcardId,
        time_spent: updatedTimeSpent,
      },
    });

    // updating overall progress in subject
    const progressMetric = await this.progress_tracker.getMetrixById(
      userId,
      flashcard.Topic.subject_id,
    );

    const newTimeSpent = (progressMetric?.time_spent || 0) + timeSpent;

    const completedTopics = (progressMetric?.completed_topics || 0) + 1;

    const accuracyRate =
      ((progressMetric?.accuracy_rate || 0) * (completedTopics - 1) +
        (isCorrect ? 1 : 0)) /
      completedTopics;

    await this.progress_tracker.updateMetrix(
      userId,
      flashcard.Topic.subject_id,
      {
        completed_topics: completedTopics,
        accuracy_rate: accuracyRate,
        time_spent: newTimeSpent,
      },
    );

    return userProgress;
  }

  async getFlashcardsToRepeat(
    userId: string,
    topicId?: string,
    skip: number = 0,
    take: number = DEFAULT_CARDS_TAKE,
  ) {
    const today = new Date();

    const progresses = await this.prisma.userFlashcardProgress.findMany({
      where: {
        user_id: userId,
        Flashcard: topicId ? { topic_id: topicId } : undefined,
        nextReview: { lte: today },
      },
      include: { Flashcard: { include: { answers: true } } },
      skip,
      take,
      orderBy: { nextReview: 'asc' },
    });

    return progresses.map((p) => ({
      ...p.Flashcard,
      interval: p.interval,
      repetition: p.repetition,
      ef: p.ef,
      nextReview: p.nextReview,
    }));
  }
}
