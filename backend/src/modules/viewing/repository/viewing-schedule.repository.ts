import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../../common/persistence/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import { type ViewingScheduleRecord, viewingScheduleSelect } from './record/viewing.record';

export interface ScheduleColumns {
  slotMinutes: number;
  noticeHours: number;
  horizonDays: number;
  windows: Prisma.InputJsonValue;
  blockedDays: Prisma.InputJsonValue;
}

@Injectable()
export class ViewingScheduleRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  findByListing(listingId: string): Promise<ViewingScheduleRecord | null> {
    return this.txHost.tx.viewingSchedule.findUnique({
      where: { listingId },
      select: viewingScheduleSelect,
    });
  }

  async create(listingId: string, data: ScheduleColumns, actorUserId: string): Promise<void> {
    await this.txHost.tx.viewingSchedule.create({
      data: { listingId, ...data, createdBy: actorUserId, updatedBy: actorUserId },
      select: { listingId: true },
    });
  }

  /** Optimistic replace of the whole document; false when the row changed meanwhile. */
  async update(
    listingId: string,
    version: number,
    data: ScheduleColumns,
    actorUserId: string,
  ): Promise<boolean> {
    const { count } = await this.txHost.tx.viewingSchedule.updateMany({
      where: { listingId, version },
      data: { ...data, updatedBy: actorUserId, version: { increment: 1 } },
    });
    return count > 0;
  }

  async remove(listingId: string): Promise<void> {
    await this.txHost.tx.viewingSchedule.deleteMany({ where: { listingId } });
  }
}
