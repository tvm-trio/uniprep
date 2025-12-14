import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlanService } from '../study-plan/study-plan.service';
import { PrismaService } from '../common/prisma';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('StudyPlan Service Integration (DB Logic)', () => {
  let moduleRef: TestingModule;
  let service: StudyPlanService;
  let prisma: PrismaService;

  let userA_Id: string;
  let userB_Id: string;
  let subjectA_Id: string;
  let subjectB_Id: string;
  let topicA_Id: string;
  let topicB_Id: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [StudyPlanService],
    }).compile();

    service = moduleRef.get<StudyPlanService>(StudyPlanService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.topic.deleteMany();
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
    const subB = await prisma.subject.create({ data: { name: 'History' } });
    subjectB_Id = subB.id;

    const topA = await prisma.topic.create({
      data: { name: 'Algebra', subject_id: subjectA_Id },
    });
    topicA_Id = topA.id;
    const topB = await prisma.topic.create({
      data: { name: 'WW2', subject_id: subjectB_Id },
    });
    topicB_Id = topB.id;
  });

  afterAll(async () => {
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();
    await moduleRef.close();
  });

  describe('createPlan (Validation & Logic)', () => {
    it('should BLOCK creating a plan if the topic does not belong to the subject', async () => {
      const invalidDto = {
        subjectId: subjectA_Id,
        topics: [{ topicId: topicB_Id }],
      };

      await expect(service.createPlan(userA_Id, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully create a valid plan', async () => {
      const validDto = {
        subjectId: subjectA_Id,
        topics: [{ topicId: topicA_Id }],
      };

      const result = await service.createPlan(userA_Id, validDto);

      expect(result.subject_id).toBe(subjectA_Id);
      expect(result.PlanTopics).toHaveLength(1);
      expect(result.PlanTopics[0].topic_id).toBe(topicA_Id);
    });

    it('should UPDATE existing plan instead of creating duplicate if called twice', async () => {
      const dto = {
        subjectId: subjectA_Id,
        topics: [{ topicId: topicA_Id }],
      };

      await service.createPlan(userA_Id, dto);

      const result = await service.createPlan(userA_Id, dto);

      const count = await prisma.studyPlan.count({
        where: { user_id: userA_Id, subject_id: subjectA_Id },
      });

      expect(count).toBe(1);
      expect(result.id).toBeDefined();
    });
  });

  describe('updateTopicStatus (Security)', () => {
    let planTopicId: string;

    beforeAll(async () => {
      const plan = await service.getPlanBySubject(userA_Id, subjectA_Id);
      planTopicId = plan.PlanTopics[0].id;
    });

    it('should allow the OWNER to update status', async () => {
      const result = await service.updateTopicStatus(
        userA_Id,
        planTopicId,
        'COMPLETED' as any,
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('should FORBID another user from updating the status', async () => {
      await expect(
        service.updateTopicStatus(userB_Id, planTopicId, 'COMPLETED' as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
