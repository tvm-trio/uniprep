import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Metrix } from './interfaces';
import { MetrixBodyType } from './types';
import { ERROR_MESSAGES } from '@common/constants';

@Injectable()
export class ProgressTrackerService {
  constructor(private prisma: PrismaClient) {}

  async getMetrix() {
    const metrics = await this.prisma.progress.findMany();
    return metrics;
  }

  async getMetrixById(userId: string, subjectId: string) {
    const metric = await this.prisma.progress.findUnique({
      where: {
        user_id_subject_id: {
          user_id: userId,
          subject_id: subjectId,
        },
      },
    });

    return metric;
  }

  async addMetrix(userId: string, body: MetrixBodyType) {
    const metricExists = await this.prisma.progress.findUnique({
      where: {
        user_id_subject_id: { user_id: userId, subject_id: body.subject_id },
      },
    });

    if (metricExists) {
      throw new ForbiddenException(ERROR_MESSAGES.METRIC_ALREADY_EXISTS);
    }

    const newMetric = await this.prisma.progress.create({
      data: { user_id: userId, ...body },
    });

    return newMetric;
  }

  async updateMetrix(
    userId: string,
    subjectId: string,
    body: Omit<Metrix, 'id' | 'updated_at' | 'user_id' | 'subject_id'>,
  ) {
    const updatedMetric = await this.prisma.progress.upsert({
      where: {
        user_id_subject_id: {
          user_id: userId,
          subject_id: subjectId,
        },
      },
      update: { user_id: userId, subject_id: subjectId, ...body },
      create: { user_id: userId, subject_id: subjectId, ...body },
    });

    return updatedMetric;
  }

  async deleteMetrix(userId: string, subjectId: string) {
    const deleted = await this.prisma.progress.delete({
      where: {
        user_id_subject_id: {
          user_id: userId,
          subject_id: subjectId,
        },
      },
    });

    return {
      message: `Metric with subjectId ${subjectId} was deleted`,
      data: deleted,
    };
  }
}
