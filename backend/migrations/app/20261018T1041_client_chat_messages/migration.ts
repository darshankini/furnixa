#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9ec008e16d4d66c2780c1aa6d189b548ac9b5ca7b380bb5249936b8a709023a4/contract';
import endContract from '../../snapshots/9ec008e16d4d66c2780c1aa6d189b548ac9b5ca7b380bb5249936b8a709023a4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cd9e4c2d7d0cd3219ce2fddd05be2441cf279a91938122f3756a86ddb0884e1a/contract';
import startContract from '../../snapshots/cd9e4c2d7d0cd3219ce2fddd05be2441cf279a91938122f3756a86ddb0884e1a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ChatMessage',
        column: col('clientId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'ChatMessage', column: 'userId' }),
      this.createIndex({
        schema: 'public',
        table: 'ChatMessage',
        index: 'ChatMessage_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChatMessage',
        foreignKey: {
          name: 'ChatMessage_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
