import { Body, Controller, Get, Post, Delete } from '@nestjs/common';
import { DbFillService } from './db_fill.service';

@Controller('db-fill')
export class DbFillController {
  constructor(private dbFillService: DbFillService) { }

  @Get('all-topic')
  async findAll() {
    return await this.dbFillService.findAll();
  }

  @Post('db-topic-history')
  async insertTopic() {
    return await this.dbFillService.insertTopic();
  }

  @Post('db-task-history')
  async insertTask() {
    return await this.dbFillService.insertTask();
  }

  @Get('answers-num')
  async answersNum() {
    return await this.dbFillService.answersInfo();
  }

  @Post('subject')
  async insertSub(@Body() body: { subject: string }) {
    return await this.dbFillService.insertSub(body.subject);
  }

  @Delete('delete-empty-topics')
  async deleteEmptyTopics() {
    return await this.dbFillService.deleteEmptyTopics();
  }

  @Delete('delete-empty-flashcards')
  async deleteEmptyFlashcards() {
    return await this.dbFillService.deleteEmptyFlashcards();
  }

}
