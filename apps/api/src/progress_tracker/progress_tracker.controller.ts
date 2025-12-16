import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Req,
} from '@nestjs/common';
import { ProgressTrackerService } from './progress_tracker.service';
import { type MetrixBodyType } from './types';

@Controller('progress-tracker')
export class ProgressTrackerController {
  constructor(private progressTrackerService: ProgressTrackerService) { }

  @Get('all-metrix')
  async getMetrix() {
    return this.progressTrackerService.getMetrix();
  }

  @Get('metrix/:subjectId')
  async getMetrixById(@Req() req, @Param('subjectId') subjectId: string) {
    const userId = req.user.sub;
    return this.progressTrackerService.getMetrixById(userId, subjectId);
  }

  @Post('metrix')
  async addMetrix(@Req() req, @Body() body: MetrixBodyType) {
    const userId = req.user.sub;
    return this.progressTrackerService.addMetrix(userId, body);
  }

  @Put('metrix/:subjectId')
  async updateMetrix(
    @Req() req,
    @Param('subjectId') subjectId: string,
    @Body() body: MetrixBodyType,
  ) {
    const userId = req.user.sub;
    return this.progressTrackerService.updateMetrix(userId, subjectId, body);
  }

  @Delete('metrix/:subjectId')
  async deleteMetrix(@Req() req, @Param('subjectId') subjectId: string) {
    const userId = req.user.sub;
    return this.progressTrackerService.deleteMetrix(userId, subjectId);
  }
}
