#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/785d1789a4b3343e0834e77c3ec2ebb1c5e3cff818aa68df2e5ee7575c6a064c/contract';
import startContract from '../../snapshots/785d1789a4b3343e0834e77c3ec2ebb1c5e3cff818aa68df2e5ee7575c6a064c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a39af14b1c4ffb468f1ca43a2cf9d98b513a461e2bbb2b14a1f645a9291461d4/contract';
import endContract from '../../snapshots/a39af14b1c4ffb468f1ca43a2cf9d98b513a461e2bbb2b14a1f645a9291461d4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('projectCompletionOn', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('projectConfirmedOn', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
