#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7616f814b4dd835c973d571aa0391851459d524a717228e76af10fffcef1d359/contract';
import endContract from '../../snapshots/7616f814b4dd835c973d571aa0391851459d524a717228e76af10fffcef1d359/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dcfe23be405b9bb391de3804076c7232bd54d61aa25c94d5bb58d12e8543e898/contract';
import startContract from '../../snapshots/dcfe23be405b9bb391de3804076c7232bd54d61aa25c94d5bb58d12e8543e898/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('productionStage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('productionStageUpdatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('productionStageUpdatedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Lead',
        constraint: 'Lead_productionStage_check_388366db',
        expression:
          "\"productionStage\" IN ('PRESSING_01_8FT', 'PRESSING_02_10FT', 'CUTTING_01', 'CUTTING_02', 'EDGE_BENDING_01', 'EDGE_BENDING_02', 'FINISHING', 'CUT_OUT_MANUAL', 'CARPENTER', 'ROUTER_AND_HANDLE', 'DRILLING', 'CNC', 'ASSEMBLY_QC', 'PACKING', 'DISPATCH_DEPARTMENT', 'BILLING')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_productionStageUpdatedById_idx_c7ffc0b1',
        columns: ['productionStageUpdatedById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_productionStageUpdatedById_fkey',
          columns: ['productionStageUpdatedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
