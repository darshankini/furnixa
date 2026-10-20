#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/87d1b5c89400c6f4c82d6b4e93545885dc954220f298674333fa680c83c8bc5a/contract';
import startContract from '../../snapshots/87d1b5c89400c6f4c82d6b4e93545885dc954220f298674333fa680c83c8bc5a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dcfe23be405b9bb391de3804076c7232bd54d61aa25c94d5bb58d12e8543e898/contract';
import endContract from '../../snapshots/dcfe23be405b9bb391de3804076c7232bd54d61aa25c94d5bb58d12e8543e898/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Lead',
        column: col('quotationAmount', 'numeric(12,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
