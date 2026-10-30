#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2328b9222ac9ebca68d474c1d521f5ce3242b701767f687acbd206e1ec30a748/contract';
import startContract from '../../snapshots/2328b9222ac9ebca68d474c1d521f5ce3242b701767f687acbd206e1ec30a748/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/785d1789a4b3343e0834e77c3ec2ebb1c5e3cff818aa68df2e5ee7575c6a064c/contract';
import endContract from '../../snapshots/785d1789a4b3343e0834e77c3ec2ebb1c5e3cff818aa68df2e5ee7575c6a064c/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Notification',
        columns: [
          col('actorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('chatMessageId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('clientId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('preview', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('recipientType', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Notification_type_check_b3c1b175', '"type" IN (\'MENTION\')'),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_chatMessageId_idx_d1dd4b1d',
        columns: ['chatMessageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_clientId_readAt_idx_22a96b93',
        columns: ['clientId', 'readAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_userId_readAt_idx_8bd92969',
        columns: ['userId', 'readAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_chatMessageId_fkey',
          columns: ['chatMessageId'],
          references: { schema: 'public', table: 'ChatMessage', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
