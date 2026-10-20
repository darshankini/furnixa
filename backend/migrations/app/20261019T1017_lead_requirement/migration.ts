#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/87d1b5c89400c6f4c82d6b4e93545885dc954220f298674333fa680c83c8bc5a/contract';
import endContract from '../../snapshots/87d1b5c89400c6f4c82d6b4e93545885dc954220f298674333fa680c83c8bc5a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cb7a4b753d99d509678c20dcfd87353f85d28938ca35e39347f837153d689d14/contract';
import startContract from '../../snapshots/cb7a4b753d99d509678c20dcfd87353f85d28938ca35e39347f837153d689d14/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('requirement', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
