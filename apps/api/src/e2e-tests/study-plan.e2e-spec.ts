jest.mock('nodemailer-express-handlebars', () => {
  return () => {
    return function (_mail, callback) {
      if (callback) callback();
    };
  };
});

jest.mock('../study-plan/gpt_settings/gptReqFunc', () => ({
  supportMsg: jest.fn().mockResolvedValue({
    output_text: JSON.stringify({ message: 'E2E AI Motivation' }),
  }),
  analiseAnswers: jest.fn().mockImplementation(async (topics) => ({
    output_text: {
      ids: JSON.stringify(
        topics.map((t) => ({ topicId: t.topicId, topic: t.topic })),
      ),
    },
  })),
}));

import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../common/prisma';

describe('StudyPlan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let testUserId: string;
  let testSubjectId: string;
  let testTopicId: string;
  let testFlashcardId: string;
  let testWrongAnswerId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.userFlashcardProgress.deleteMany();
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    const subject = await prisma.subject.create({
      data: { name: 'E2E Subject' },
    });
    testSubjectId = subject.id;

    const topic = await prisma.topic.create({
      data: { name: 'E2E Topic', subject_id: testSubjectId },
    });
    testTopicId = topic.id;

    const flashcard = await prisma.flashcard.create({
      data: {
        question: 'E2E Question?',
        topic_id: testTopicId,
        answers: {
          create: [
            { text: 'Wrong', isCorrect: false },
            { text: 'Correct', isCorrect: true },
          ],
        },
      },
      include: { answers: true },
    });
    testFlashcardId = flashcard.id;
    testWrongAnswerId = flashcard.answers.find((a) => !a.isCorrect)?.id || '';

    const authResponse = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ email: 'e2e@test.com', password: 'password' })
      .expect(201);

    accessToken = authResponse.body.access_token;

    const user = await prisma.user.findUnique({
      where: { email: 'e2e@test.com' },
    });
    if (!user) {
      throw new Error('User not found after sign-up');
    }
    testUserId = user.id;
  }, 60000);

  afterAll(async () => {
    await prisma.userFlashcardProgress.deleteMany();
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.flashcard.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    await app.close();
  });

  it('POST /study-plans/generate-study-plan should analyze results and create plan', async () => {
    const payload = {
      userId: testUserId,
      subjectId: testSubjectId,
      results: [
        {
          topicId: testTopicId,
          flashcardId: testFlashcardId,
          answerId: testWrongAnswerId,
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/study-plans/generate-study-plan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.message).toBe('E2E AI Motivation');
    expect(response.body.topics).toBeInstanceOf(Array);
    expect(response.body.topics).toContainEqual(
      expect.objectContaining({ topicId: testTopicId }),
    );

    const savedPlan = await prisma.studyPlan.findFirst({
      where: { user_id: testUserId, subject_id: testSubjectId },
      include: { PlanTopics: true },
    });

    expect(savedPlan).toBeDefined();
    if (!savedPlan) {
      throw new Error('savedPlan is null');
    }
    expect(savedPlan.PlanTopics.length).toBe(1);
    expect(savedPlan.PlanTopics[0].topic_id).toBe(testTopicId);
  });

  it('GET /study-plans/subject/:subjectId should return the generated plan', async () => {
    const response = await request(app.getHttpServer())
      .get(`/study-plans/subject/${testSubjectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.subject_id).toBe(testSubjectId);
    expect(response.body.PlanTopics.length).toBeGreaterThan(0);
    expect(response.body.PlanTopics[0].name).toBe('E2E Topic');
  });
});
