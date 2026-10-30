#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2328b9222ac9ebca68d474c1d521f5ce3242b701767f687acbd206e1ec30a748/contract';
import endContract from '../../snapshots/2328b9222ac9ebca68d474c1d521f5ce3242b701767f687acbd206e1ec30a748/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f70635337f9fa84ce0349340adef59b5bad49bf2a1d75db6b75b70086e8787eb/contract';
import startContract from '../../snapshots/f70635337f9fa84ce0349340adef59b5bad49bf2a1d75db6b75b70086e8787eb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ChatMessage',
        column: col('attachmentMimeType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ChatMessage',
        column: col('attachmentName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ChatMessage',
        column: col('attachmentPath', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ChatMessage',
        column: col('attachmentSize', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
