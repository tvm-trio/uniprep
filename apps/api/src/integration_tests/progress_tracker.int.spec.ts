import { PrismaService } from "@common/prisma";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import { ProgressTrackerService } from "../progress_tracker/progress_tracker.service";


describe('ProgressTrackerService (integration)', () => {
    let service: ProgressTrackerService;
    let prisma: PrismaClient;

    beforeAll(async () => {
        prisma = new PrismaClient();

        const module = await Test.createTestingModule({
            providers: [ProgressTrackerService, PrismaClient],
        }).compile();

        service = module.get(ProgressTrackerService);
    });

    beforeEach(async () => {
        await prisma.progress.deleteMany();
        await prisma.user.deleteMany();
        await prisma.subject.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('creates metric in DB', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'test@mail.com',
                password: 'hashed',
            },
        });

        const subject = await prisma.subject.create({
            data: {
                name: "History"
            },
        });

        await service.addMetrix(user.id, {
            subject_id: subject.id,
            completed_topics: 5,
            accuracy_rate: 80,
            time_spent: 30,
        });

        const fromDb = await prisma.progress.findFirst({
            where: {
                user_id: user.id,
                subject_id: subject.id

            },
        });

        expect(fromDb).not.toBeNull();
        expect(fromDb!.completed_topics).toBe(5);
    });


    it('getMetrixById → returns metric from DB', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'get@test.com',
                password: 'hashed',
            },
        });

        const subject = await prisma.subject.create({
            data: { name: 'Math' },
        });

        await prisma.progress.create({
            data: {
                user_id: user.id,
                subject_id: subject.id,
                completed_topics: 3,
                accuracy_rate: 70,
                time_spent: 15,
            },
        });

        const metric = await service.getMetrixById(user.id, subject.id);

        expect(metric).not.toBeNull();
        expect(metric!.completed_topics).toBe(3);
        expect(metric!.accuracy_rate).toBe(70);
    });


    it('updateMetrix → creates metric if not exists (upsert)', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'upsert-create@test.com',
                password: 'hashed',
            },
        });

        const subject = await prisma.subject.create({
            data: { name: 'Physics' },
        });

        const result = await service.updateMetrix(user.id, subject.id, {
            completed_topics: 8,
            accuracy_rate: 85,
            time_spent: 40,
        });

        expect(result).not.toBeNull();

        const fromDb = await prisma.progress.findUnique({
            where: {
                user_id_subject_id: {
                    user_id: user.id,
                    subject_id: subject.id,
                },
            },
        });

        expect(fromDb).not.toBeNull();
        expect(fromDb!.completed_topics).toBe(8);
    });


    it('deleteMetrix → deletes metric from DB', async () => {
        const user = await prisma.user.create({
            data: {
                email: 'delete@test.com',
                password: 'hashed',
            },
        });

        const subject = await prisma.subject.create({
            data: { name: 'Biology' },
        });

        await prisma.progress.create({
            data: {
                user_id: user.id,
                subject_id: subject.id,
                completed_topics: 4,
                accuracy_rate: 60,
                time_spent: 20,
            },
        });

        const result = await service.deleteMetrix(user.id, subject.id);

        expect(result.message).toContain(subject.id);

        const fromDb = await prisma.progress.findUnique({
            where: {
                user_id_subject_id: {
                    user_id: user.id,
                    subject_id: subject.id,
                },
            },
        });

        expect(fromDb).toBeNull();
    });


});
