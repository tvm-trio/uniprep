import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateStudyPlanDto } from './dto/create-study-plan.dto';
import { TopicStatus } from './dto/update-topic-status.dto';
import { InfoForPlan } from './interface/userPlan';
import { analiseAnswers, supportMsg, TopicObj } from './gpt_settings/gptReqFunc';

@Injectable()
export class StudyPlanService {
  constructor(private readonly prisma: PrismaService) { }

  async createPlan(params: InfoForPlan) {
    const { userId, subjectId, results } = params;

    const taskNum = results.length;

    const answers = await this.prisma.answer.findMany({
      where: {
        id: { in: results.map(r => r.answerId) },
      },
      include: {
        Flashcard: {
          include: { Topic: true },
        },
      },
    });

    const wrongAnswers = answers.filter(a => !a.isCorrect);

    const correctTaskNum = taskNum - wrongAnswers.length;

    const wrongTopicsMap = new Map<string, TopicObj>();

    for (const answer of wrongAnswers) {
      const topic = answer.Flashcard.Topic;
      if (!wrongTopicsMap.has(topic.id)) {
        wrongTopicsMap.set(topic.id, {
          topicId: topic.id,
          topic: topic.name,
        });
      }
    }

    const wrongTopics = Array.from(wrongTopicsMap.values());

    const supportResponse: any = await supportMsg({
      taskNum,
      correctTaskNum,
    });

    const supportResponseParsed = JSON.parse(supportResponse.output_text)

    const message = supportResponseParsed.message

    let analysedTopics = wrongTopics;
    if (wrongTopics.length > 0) {
      const analyseResponse: any = await analiseAnswers(wrongTopics);
      const text =
        analyseResponse.output_text.ids;

      if (text) {
        try {
          analysedTopics = JSON.parse(text);
        } catch {
          analysedTopics = wrongTopics;
        }
      }

    }

    const studyPlan: string[] = []
    analysedTopics.forEach(elem => {
      studyPlan.push(elem.topicId)
    })


    // await this.prisma.studyPlan.create({
    //   data: {
    //     user_id: userId,
    //     subject_id: subjectId,
    //     topic_ids: studyPlan
    //   }
    // })

    return {
      message,
      topics: studyPlan,
    };
  }




  // Updates the status of a specific topic
  async updateTopicStatus(
    userId: string,
    topicId: string,
    status: TopicStatus,
  ) {
    const topic = await this.prisma.planTopic.findUnique({
      where: { id: topicId },
      include: { StudyPlan: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    if (topic.StudyPlan.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this topic.',
      );
    }

    return this.prisma.planTopic.update({
      where: { id: topicId },
      data: { status },
    });
  }

  // Get ALL plans for the user
  async getAllPlansByUser(userId: string) {
    return this.prisma.studyPlan.findMany({
      where: { user_id: userId },
      orderBy: { xata_createdat: 'desc' },
      include: {
        Subject: true,
      },
    });
  }

  // Get a SINGLE plan by Subject ID
  async getPlanBySubject(userId: string, subjectId: string) {
    const plan = await this.prisma.studyPlan.findFirst({
      where: {
        user_id: userId,
        subject_id: subjectId,
      },
      include: {
        PlanTopics: {
          orderBy: { name: 'asc' }, // Order topics alphabetically (or by another field)
        },
        Subject: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `No study plan found for subject ${subjectId}`,
      );
    }

    return plan;
  }
}
