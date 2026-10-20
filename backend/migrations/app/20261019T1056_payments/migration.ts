#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7616f814b4dd835c973d571aa0391851459d524a717228e76af10fffcef1d359/contract';
import startContract from '../../snapshots/7616f814b4dd835c973d571aa0391851459d524a717228e76af10fffcef1d359/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc528ca90465185c04a3bb59168ae73cd2a947b806dd734bd8582b4ebb09a6fc/contract';
import endContract from '../../snapshots/fc528ca90465185c04a3bb59168ae73cd2a947b806dd734bd8582b4ebb09a6fc/contract.json' with { type: 'json' };
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
        table: 'Payment',
        columns: [
          col('amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidOn', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Payment_mode_check_2a8e01d1',
            "\"mode\" IN ('CASH', 'UPI', 'CARD', 'CHEQUE')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_paidOn_idx_100b346d',
        columns: ['paidOn'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Payment',
        foreignKey: {
          name: 'Payment_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
