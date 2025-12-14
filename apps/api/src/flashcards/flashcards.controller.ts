import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service';
import { DEFAULT_CARDS_TAKE, ENTRY_TEST_CARDS_NUMBER } from './constants';
import { type SubmitAnswerBody } from './interfaces';

@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly service: FlashcardsService) {}

  @Get('topic/:topicId')
  getFlashcardsByTopic(
    @Param('topicId') topicId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = DEFAULT_CARDS_TAKE,
  ) {
    return this.service.getFlashcardsByTopic(topicId, skip, take);
  }

  @Get('entry-test')
  async getEntryTestFlashcards(
    @Query('subjectId') subjectId?: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = ENTRY_TEST_CARDS_NUMBER,
  ) {
    return await this.service.getEntryTestFlashcards(subjectId, skip, take);
  }

  @Post('submit-answer')
  submitAnswer(@Body() body: SubmitAnswerBody) {
    return this.service.submitAnswer(body);
  }

  @Get('to-repeat')
  async getFlashcardsToRepeat(
    @Query('topicId') topicId?: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = DEFAULT_CARDS_TAKE,
  ) {
    return await this.service.getFlashcardsToRepeat(topicId, skip, take);
  }
}
