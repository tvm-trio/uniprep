jest.mock('nodemailer-express-handlebars', () => {
  return () => {
    return function (_mail, callback) {
      if (callback) callback();
    };
  };
});

import { PrismaService } from '@common/prisma';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { MailService } from '../mail/mail.service';
import request from 'supertest';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockMailService = {
    sendMail: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();

    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const user = {
    email: 'test@example.com',
    password: 'password123',
  };

  let accessToken: string;
  let refreshToken: string;

  it('1. sign-up', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send(user)
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
    expect(mockMailService.sendMail).toHaveBeenCalled();

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('2. sign-in', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send(user)
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();

    accessToken = res.body.access_token;
  });

  it('3. getMe', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(user.email);
  });
});
