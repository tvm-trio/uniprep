import { Test, TestingModule } from '@nestjs/testing';
import { ProgressTrackerController } from './progress_tracker.controller';
import { ProgressTrackerService } from './progress_tracker.service';

describe('ProgressTrackerController (unit)', () => {
    let controller: ProgressTrackerController;
    let service: jest.Mocked<ProgressTrackerService>;

    const serviceMock = {
        getMetrix: jest.fn(),
        getMetrixById: jest.fn(),
        addMetrix: jest.fn(),
        updateMetrix: jest.fn(),
        deleteMetrix: jest.fn(),
    };

    const reqMock = {
        user: { sub: 'user-1' },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProgressTrackerController],
            providers: [
                { provide: ProgressTrackerService, useValue: serviceMock },
            ],
        }).compile();

        controller = module.get(ProgressTrackerController);
        service = module.get(ProgressTrackerService);
        jest.clearAllMocks();
    });

    it('getMetrix', async () => {
        service.getMetrix.mockResolvedValue([]);

        const result = await controller.getMetrix();

        expect(service.getMetrix).toHaveBeenCalled();
        expect(result).toEqual([]);
    });

    it('getMetrixById', async () => {
        service.getMetrixById.mockResolvedValue({ id: 'm1' } as any);

        const result = await controller.getMetrixById(reqMock as any, 's1');

        expect(service.getMetrixById).toHaveBeenCalledWith('user-1', 's1');
        expect(result).toEqual({ id: 'm1' });
    });

    it('addMetrix', async () => {
        service.addMetrix.mockResolvedValue({ id: 'm1' } as any);

        const body = { subject_id: 's1' };

        const result = await controller.addMetrix(reqMock as any, body as any);

        expect(service.addMetrix).toHaveBeenCalledWith('user-1', body);
        expect(result).toEqual({ id: 'm1' });
    });

    it('updateMetrix', async () => {
        service.updateMetrix.mockResolvedValue({ id: 'm1' } as any);

        const result = await controller.updateMetrix(
            reqMock as any,
            's1',
            { completed_topics: 10 } as any,
        );

        expect(service.updateMetrix).toHaveBeenCalledWith(
            'user-1',
            's1',
            { completed_topics: 10 },
        );
        expect(result).toEqual({ id: 'm1' });
    });

    it('deleteMetrix', async () => {
        service.deleteMetrix.mockResolvedValue({ success: true } as any);

        const result = await controller.deleteMetrix(reqMock as any, 's1');

        expect(service.deleteMetrix).toHaveBeenCalledWith('user-1', 's1');
        expect(result).toEqual({ success: true });
    });
});
