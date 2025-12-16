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

describe('EntryTest - StudyPlan Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let testUserId: string;
  let testSubjectId: string;
  let testTopicId: string;

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

    await prisma.flashcard.create({
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

    const authResponse = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ email: 'e2e@test.com', password: 'password' })
      .expect(201);

    accessToken = authResponse.body.access_token;

    const user = await prisma.user.findUnique({
      where: { email: 'e2e@test.com' },
    });
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

  it('should complete full flow: Take Entry Test -> Generate Plan -> Fetch Plan', async () => {
    const entryTestResponse = await request(app.getHttpServer())
      .get(`/flashcards/entry-test?subjectId=${testSubjectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(entryTestResponse.body)).toBe(true);
    expect(entryTestResponse.body.length).toBeGreaterThan(0);

    const receivedFlashcard = entryTestResponse.body[0];
    expect(receivedFlashcard.question).toBe('E2E Question?');
    expect(receivedFlashcard.answers.length).toBeGreaterThan(0);

    const wrongAnswer = receivedFlashcard.answers.find((a) => !a.isCorrect);
    expect(wrongAnswer).toBeDefined();

    const generatePayload = {
      userId: testUserId,
      subjectId: testSubjectId,
      results: [
        {
          topicId: receivedFlashcard.topic_id,
          flashcardId: receivedFlashcard.id,
          answerId: wrongAnswer.id,
        },
      ],
    };

    const generateResponse = await request(app.getHttpServer())
      .post('/study-plans/generate-study-plan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(generatePayload)
      .expect(201);

    expect(generateResponse.body.message).toBe('E2E AI Motivation');
    expect(generateResponse.body.topics).toContainEqual(
      expect.objectContaining({ topicId: testTopicId }),
    );

    const savedPlan = await prisma.studyPlan.findFirst({
      where: { user_id: testUserId, subject_id: testSubjectId },
      include: { PlanTopics: true },
    });

    expect(savedPlan).toBeDefined();
    expect(savedPlan.PlanTopics.length).toBe(1);
    expect(savedPlan.PlanTopics[0].topic_id).toBe(testTopicId);

    const fetchPlanResponse = await request(app.getHttpServer())
      .get(`/study-plans/subject/${testSubjectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(fetchPlanResponse.body.subject_id).toBe(testSubjectId);
    expect(fetchPlanResponse.body.PlanTopics[0].name).toBe('E2E Topic');
  });
});
