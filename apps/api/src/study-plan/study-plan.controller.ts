import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { StudyPlanService } from './study-plan.service';
import { CreateStudyPlanDto } from './dto/create-study-plan.dto';
import { UpdateTopicStatusDto } from './dto/update-topic-status.dto';
import { Result } from './interface/userPlan';

@Controller('study-plans')
export class StudyPlanController {
  constructor(private readonly studyPlanService: StudyPlanService) { }

  @Post("generate-study-plan")
  async createStudyPlan(@Body() body: { userId: string, subjectId: string, results: Result[] }) {
    return this.studyPlanService.createPlan(body)
  }

  @Get()
  async getAllMyPlans(@Req() req) {
    const userId = req.user.sub;
    return this.studyPlanService.getAllPlansByUser(userId);
  }

  @Get('subject/:subjectId')
  async getPlanBySubject(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.studyPlanService.getPlanBySubject(userId, subjectId);
  }

  @Patch('topics/:topicId')
  async updateTopicStatus(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Body() updateStatusDto: UpdateTopicStatusDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    const updatedTopic = await this.studyPlanService.updateTopicStatus(
      userId,
      topicId,
      updateStatusDto.status,
    );

    return {
      message: 'Topic status updated successfully.',
      data: updatedTopic,
    };
  }
}
