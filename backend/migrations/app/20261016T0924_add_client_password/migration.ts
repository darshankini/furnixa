#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6d6f24dcadbc3ef4a0a44ea4132f72d58e235645844bd0133119f2bef288c7fa/contract';
import startContract from '../../snapshots/6d6f24dcadbc3ef4a0a44ea4132f72d58e235645844bd0133119f2bef288c7fa/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cd9e4c2d7d0cd3219ce2fddd05be2441cf279a91938122f3756a86ddb0884e1a/contract';
import endContract from '../../snapshots/cd9e4c2d7d0cd3219ce2fddd05be2441cf279a91938122f3756a86ddb0884e1a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Document',
        constraint: 'Document_department_check_1c4f5751',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Document',
        constraint: 'Document_status_check_78e33087',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Lead',
        constraint: 'Lead_status_check_78e33087',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_fromStatus_check_7ac22622',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_toStatus_check_22392df3',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_b6eade79',
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Document',
        constraint: 'Document_department_check_602d6925',
        expression:
          "\"department\" IN ('SALES', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'ACCOUNTS', 'DISPATCH')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Document',
        constraint: 'Document_status_check_1d1d9eee',
        expression:
          "\"status\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Lead',
        constraint: 'Lead_status_check_1d1d9eee',
        expression:
          "\"status\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_fromStatus_check_270765ff',
        expression:
          "\"fromStatus\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_toStatus_check_689ba99c',
        expression:
          "\"toStatus\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_e190c4b5',
        expression:
          "\"role\" IN ('ADMIN', 'MANAGER', 'SALES', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS', 'USER')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
