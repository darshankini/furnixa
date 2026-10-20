#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9ec008e16d4d66c2780c1aa6d189b548ac9b5ca7b380bb5249936b8a709023a4/contract';
import startContract from '../../snapshots/9ec008e16d4d66c2780c1aa6d189b548ac9b5ca7b380bb5249936b8a709023a4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cb7a4b753d99d509678c20dcfd87353f85d28938ca35e39347f837153d689d14/contract';
import endContract from '../../snapshots/cb7a4b753d99d509678c20dcfd87353f85d28938ca35e39347f837153d689d14/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ChatMessage',
        column: col('userType', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      // Existing messages: 2 when a client sent it, 1 (staff user) otherwise
      this.dataTransform(contract, 'backfill-ChatMessage-userType', {
        check: () => db.public.ChatMessage.select('id').where((f, fns) => fns.eq(f.userType, null)).limit(1),
        run: [
          () =>
            db.public.ChatMessage.update({ userType: 2 }).where((f, fns) =>
              fns.and(fns.eq(f.userType, null), fns.ne(f.clientId, null)),
            ),
          () => db.public.ChatMessage.update({ userType: 1 }).where((f, fns) => fns.eq(f.userType, null)),
        ],
      }),
      this.setNotNull({ schema: 'public', table: 'ChatMessage', column: 'userType' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
