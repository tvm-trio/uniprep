jest.mock('nodemailer-express-handlebars', () => {
    return () => {
        return function (_mail, callback) {
            if (callback) callback();
        };
    };
});

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module';
import { PrismaService } from '@common/prisma';
import { MailService } from '../mail/mail.service';

describe('ProgressTracker (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(MailService)
            .useValue({
                sendMail: jest.fn(),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
        await prisma.progress.deleteMany();
        await prisma.subject.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it('POST /progress-tracker/metrix creates metric', async () => {
        const subject = await prisma.subject.create({
            data: { name: 'History' },
        });

        const authResponse = await request(app.getHttpServer())
            .post('/auth/sign-up')
            .send({
                email: 'tn@gmail.com',
                password: '1488',
            })
            .expect(201);

        const accessToken = authResponse.body.access_token;

        const response = await request(app.getHttpServer())
            .post('/progress-tracker/metrix')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                subject_id: subject.id,
                completed_topics: 5,
                accuracy_rate: 80,
                time_spent: 30,
            })
            .expect(201);

        expect(response.body.completed_topics).toBe(5);

        const fromDb = await prisma.progress.findFirst({
            where: {
                subject_id: subject.id,
            },
        });

        expect(fromDb).not.toBeNull();
        expect(fromDb!.completed_topics).toBe(5);
    });


    it('GET /progress-tracker/metrix/:subjectId returns metric', async () => {
        const subject = await prisma.subject.create({
            data: { name: 'History' },
        });

        const authResponse = await request(app.getHttpServer())
            .post('/auth/sign-up')
            .send({
                email: 'get@test.com',
                password: '1488',
            })
            .expect(201);

        const accessToken = authResponse.body.access_token;

        await request(app.getHttpServer())
            .post('/progress-tracker/metrix')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                subject_id: subject.id,
                completed_topics: 3,
                accuracy_rate: 70,
                time_spent: 15,
            })
            .expect(201);

        const response = await request(app.getHttpServer())
            .get(`/progress-tracker/metrix/${subject.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body).not.toBeNull();
        expect(response.body.completed_topics).toBe(3);
    });


    it('PUT /progress-tracker/metrix/:subjectId updates metric', async () => {
        const subject = await prisma.subject.create({
            data: { name: 'History' },
        });

        const authResponse = await request(app.getHttpServer())
            .post('/auth/sign-up')
            .send({
                email: 'put@test.com',
                password: '1488',
            })
            .expect(201);

        const accessToken = authResponse.body.access_token;

        await request(app.getHttpServer())
            .post('/progress-tracker/metrix')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                subject_id: subject.id,
                completed_topics: 2,
                accuracy_rate: 60,
                time_spent: 10,
            })
            .expect(201);
        const response = await request(app.getHttpServer())
            .put(`/progress-tracker/metrix/${subject.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                completed_topics: 6,
                accuracy_rate: 90,
                time_spent: 40,
            })
            .expect(200);

        expect(response.body.completed_topics).toBe(6);

        const fromDb = await prisma.progress.findFirst({
            where: {
                subject_id: subject.id,
            },
        });

        expect(fromDb).not.toBeNull();
        expect(fromDb!.accuracy_rate).toBe(90);
    });


    it('DELETE /progress-tracker/metrix/:subjectId deletes metric', async () => {
        const subject = await prisma.subject.create({
            data: { name: 'History' },
        });

        const authResponse = await request(app.getHttpServer())
            .post('/auth/sign-up')
            .send({
                email: 'delete@test.com',
                password: '1488',
            })
            .expect(201);

        const accessToken = authResponse.body.access_token;
        await request(app.getHttpServer())
            .post('/progress-tracker/metrix')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                subject_id: subject.id,
                completed_topics: 4,
                accuracy_rate: 75,
                time_spent: 20,
            })
            .expect(201);

        const response = await request(app.getHttpServer())
            .delete(`/progress-tracker/metrix/${subject.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(response.body.message).toContain(subject.id);

        const fromDb = await prisma.progress.findFirst({
            where: {
                subject_id: subject.id,
            },
        });

        expect(fromDb).toBeNull();
    });

});
