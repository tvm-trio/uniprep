import { Test, TestingModule } from '@nestjs/testing';
import { ProgressTrackerService } from './progress_tracker.service';
import { PrismaClient } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants';

describe('ProgressTrackerService (unit)', () => {
    let service: ProgressTrackerService;
    const prismaMock = {
        progress: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
            delete: jest.fn(),
        },
    };

    let prisma: typeof prismaMock;


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProgressTrackerService,
                {
                    provide: PrismaClient,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = module.get(ProgressTrackerService);

        prisma = prismaMock;

        jest.clearAllMocks();
    });

    it('getMetrix → returns metrics', async () => {
        const metrics = [{ id: 'm1' }];

        prisma.progress.findMany.mockResolvedValue(metrics as any);

        const result = await service.getMetrix();

        expect(prisma.progress.findMany).toHaveBeenCalledTimes(1);
        expect(result).toEqual(metrics);
    });

    it('getMetrixById → returns metric', async () => {
        const metric = { id: 'm1' };

        prisma.progress.findUnique.mockResolvedValue(metric as any);

        const result = await service.getMetrixById('u1', 's1');

        expect(prisma.progress.findUnique).toHaveBeenCalledWith({
            where: {
                user_id_subject_id: {
                    user_id: 'u1',
                    subject_id: 's1',
                },
            },
        });

        expect(result).toEqual(metric);
    });

    it('addMetrix → throws if metric exists', async () => {
        prisma.progress.findUnique.mockResolvedValue({ id: 'm1' } as any);

        await expect(
            service.addMetrix('u1', { subject_id: 's1' } as any),
        ).rejects.toThrow(
            new ForbiddenException(ERROR_MESSAGES.METRIC_ALREADY_EXISTS),
        );
    });

    it('addMetrix → creates metric', async () => {
        prisma.progress.findUnique.mockResolvedValue(null);
        prisma.progress.create.mockResolvedValue({ id: 'm1' } as any);

        const body = {
            subject_id: 's1',
            completed_topics: 5,
            accuracy_rate: 80,
            time_spent: 20,
        };

        const result = await service.addMetrix('u1', body as any);

        expect(prisma.progress.create).toHaveBeenCalledWith({
            data: {
                user_id: 'u1',
                subject_id: 's1',
                completed_topics: 5,
                accuracy_rate: 80,
                time_spent: 20,
            },
        });

        expect(result).toEqual({ id: 'm1' });
    });

    it('updateMetrix → upserts metric', async () => {
        prisma.progress.upsert.mockResolvedValue({ id: 'm1' } as any);

        const result = await service.updateMetrix(
            'u1',
            's1',
            { completed_topics: 10 } as any,
        );

        expect(prisma.progress.upsert).toHaveBeenCalledWith({
            where: {
                user_id_subject_id: {
                    user_id: 'u1',
                    subject_id: 's1',
                },
            },
            update: {
                user_id: 'u1',
                subject_id: 's1',
                completed_topics: 10,
            },
            create: {
                user_id: 'u1',
                subject_id: 's1',
                completed_topics: 10,
            },
        });

        expect(result).toEqual({ id: 'm1' });
    });

    it('deleteMetrix → deletes metric', async () => {
        prisma.progress.delete.mockResolvedValue({ id: 'm1' } as any);

        const result = await service.deleteMetrix('u1', 's1');

        expect(prisma.progress.delete).toHaveBeenCalledWith({
            where: {
                user_id_subject_id: {
                    user_id: 'u1',
                    subject_id: 's1',
                },
            },
        });

        expect(result).toEqual({
            message: 'Metric with subjectId s1 was deleted',
            data: { id: 'm1' },
        });
    });
});
