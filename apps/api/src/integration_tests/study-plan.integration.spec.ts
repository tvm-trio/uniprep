import { Test, TestingModule } from '@nestjs/testing';
import { StudyPlanService } from '../study-plan/study-plan.service';
import { PrismaService } from '../common/prisma';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('StudyPlan Service Integration (DB Logic)', () => {
  let moduleRef: TestingModule;
  let service: StudyPlanService;
  let prisma: PrismaService;

  // Shared Test Data IDs
  let userA_Id: string;
  let userB_Id: string;
  let subjectA_Id: string;
  let subjectB_Id: string;
  let topicA_Id: string;
  let topicB_Id: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule], // Use Real DB connection
      providers: [StudyPlanService],
    }).compile();

    service = moduleRef.get<StudyPlanService>(StudyPlanService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    // 1. CLEAN DB
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    // 2. SEED DATA
    // Create Users
    const userA = await prisma.user.create({
      data: { email: 'userA@test.com', password: 'pw' },
    });
    userA_Id = userA.id;
    const userB = await prisma.user.create({
      data: { email: 'userB@test.com', password: 'pw' },
    });
    userB_Id = userB.id;

    // Create Subjects
    const subA = await prisma.subject.create({ data: { name: 'Math' } });
    subjectA_Id = subA.id;
    const subB = await prisma.subject.create({ data: { name: 'History' } });
    subjectB_Id = subB.id;

    // Create Topics (Topic A belongs to Math, Topic B belongs to History)
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
    // Cleanup
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();
    await moduleRef.close();
  });

  describe('createPlan (Validation & Logic)', () => {
    it('should BLOCK creating a plan if the topic does not belong to the subject', async () => {
      // Logic Check: Try to add "History Topic" to "Math Subject" Plan
      const invalidDto = {
        subjectId: subjectA_Id, // Math
        topics: [{ topicId: topicB_Id }], // History Topic
      };

      // Expect the service to catch this mismatch via DB query
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
      // Logic Check: Idempotency
      const dto = {
        subjectId: subjectA_Id,
        topics: [{ topicId: topicA_Id }],
      };

      // First Call (Already done in previous test, but we run it again to be sure)
      await service.createPlan(userA_Id, dto);

      // Second Call
      const result = await service.createPlan(userA_Id, dto);

      // Verify DB count
      const count = await prisma.studyPlan.count({
        where: { user_id: userA_Id, subject_id: subjectA_Id },
      });

      expect(count).toBe(1); // Should still be 1, not 2
      expect(result.id).toBeDefined(); // Should return the updated record
    });
  });

  describe('updateTopicStatus (Security)', () => {
    let planTopicId: string;

    beforeAll(async () => {
      // Setup: Ensure User A has a plan with a topic
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
      // User B tries to update User A's topic
      await expect(
        service.updateTopicStatus(userB_Id, planTopicId, 'COMPLETED' as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
