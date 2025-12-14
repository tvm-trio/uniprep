jest.mock('nodemailer-express-handlebars', () => {
  return () => {
    return function (_mail, callback) {
      if (callback) callback();
    };
  };
});

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

    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();

    await prisma.notification.deleteMany();

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

    const authResponse = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ email: 'e2e@test.com', password: 'password' })
      .expect(201);

    accessToken = authResponse.body.access_token;

    const user = await prisma.user.findUnique({
      where: { email: 'e2e@test.com' },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.planTopic.deleteMany();
    await prisma.studyPlan.deleteMany();

    await prisma.notification.deleteMany();

    await prisma.topic.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();

    await app.close();
  });

  it('POST /study-plans should create a plan and topics and prevent duplicates', async () => {
    const payload = {
      subjectId: testSubjectId,
      topics: [{ topicId: testTopicId }],
    };

    let response = await request(app.getHttpServer())
      .post('/study-plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.data.subject_id).toBe(testSubjectId);
    expect(response.body.data.PlanTopics.length).toBe(1);
    expect(response.body.data.PlanTopics[0].topic_id).toBe(testTopicId);

    response = await request(app.getHttpServer())
      .post('/study-plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const plansCount = await prisma.studyPlan.count({
      where: { user_id: testUserId, subject_id: testSubjectId },
    });
    expect(plansCount).toBe(1);
  });

  it('GET /study-plans/subject/:subjectId should return plan data', async () => {
    const response = await request(app.getHttpServer())
      .get(`/study-plans/subject/${testSubjectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.subject_id).toBe(testSubjectId);
  });
});
