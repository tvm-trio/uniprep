jest.mock('../study-plan/gpt_settings/gptReqFunc', () => ({
  supportMsg: jest.fn().mockResolvedValue({
    output_text: JSON.stringify({ message: 'Integration AI Motivation' }),
  }),
  analiseAnswers: jest.fn().mockImplementation(async (topics) => ({
    output_text: {
      ids: JSON.stringify(
        topics.map((t) => ({ topicId: t.topicId, topic: t.topic })),
      ),
    },
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlanService } from '../study-plan/study-plan.service';
import { PrismaService } from '../common/prisma';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TopicStatus } from '../study-plan/dto/update-topic-status.dto';

describe('StudyPlan Service Integration (DB Logic)', () => {
  let moduleRef: TestingModule;
  let service: StudyPlanService;
  let prisma: PrismaService;

  let userA_Id: string;
  let userB_Id: string;
  let subjectA_Id: string;
  let topicA_Id: string;

  let flashcardId: string;
  let answerId_Wrong: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [StudyPlanService],
    }).compile();

    service = moduleRef.get<StudyPlanService>(StudyPlanService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.userFlashcardProgress.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    const userA = await prisma.user.create({
      data: { email: 'userA@test.com', password: 'pw' },
    });
    userA_Id = userA.id;
    const userB = await prisma.user.create({
      data: { email: 'userB@test.com', password: 'pw' },
    });
    userB_Id = userB.id;

    const subA = await prisma.subject.create({ data: { name: 'Math' } });
    subjectA_Id = subA.id;

    const topA = await prisma.topic.create({
      data: { name: 'Algebra', subject_id: subjectA_Id },
    });
    topicA_Id = topA.id;

    const card = await prisma.flashcard.create({
      data: {
        question: 'What is 2+2?',
        topic_id: topicA_Id,
        answers: {
          create: [
            { text: '5', isCorrect: false },
            { text: '4', isCorrect: true },
          ],
        },
      },
      include: { answers: true },
    });
    flashcardId = card.id;
    answerId_Wrong = card.answers.find((a) => !a.isCorrect)?.id || '';
  }, 60000);

  afterAll(async () => {
    await prisma.userFlashcardProgress.deleteMany();
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();
    await moduleRef.close();
  });

  describe('createPlan (AI & DB Logic)', () => {
    it('should analyze results and create a plan with PlanTopics', async () => {
      const params = {
        userId: userA_Id,
        subjectId: subjectA_Id,
        results: [
          {
            topicId: topicA_Id,
            flashcardId: flashcardId,
            answerId: answerId_Wrong,
          },
        ],
      };

      const result = await service.createPlan(params);

      expect(result.message).toBe('Integration AI Motivation');
      expect(result.topics).toContainEqual(
        expect.objectContaining({ topicId: topicA_Id }),
      );

      const savedPlan = await prisma.studyPlan.findFirst({
        where: { user_id: userA_Id, subject_id: subjectA_Id },
        include: { PlanTopics: true },
      });

      expect(savedPlan).toBeDefined();
      expect(savedPlan).not.toBeNull();
      if (savedPlan) {
        expect(savedPlan.PlanTopics.length).toBeGreaterThan(0);
        expect(savedPlan.PlanTopics[0].topic_id).toBe(topicA_Id);
      }
    });
  });

  describe('updateTopicStatus (Security & Logic)', () => {
    let planTopicId: string;

    beforeAll(async () => {
      const plan = await prisma.studyPlan.create({
        data: {
          user_id: userA_Id,
          subject_id: subjectA_Id,
          PlanTopics: {
            create: {
              topic_id: topicA_Id,
              name: 'Algebra',
              status: 'PENDING',
            },
          },
        },
        include: { PlanTopics: true },
      });

      planTopicId = plan.PlanTopics[0].id;
    }, 60000);

    it('should allow the OWNER to update status', async () => {
      const result = await service.updateTopicStatus(
        userA_Id,
        planTopicId,
        TopicStatus.COMPLETED,
      );
      expect(result.status).toBe(TopicStatus.COMPLETED);
    });

    it('should FORBID another user from updating the status', async () => {
      await expect(
        service.updateTopicStatus(userB_Id, planTopicId, TopicStatus.COMPLETED),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFound if PlanTopic does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        service.updateTopicStatus(userA_Id, fakeId, TopicStatus.COMPLETED),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
