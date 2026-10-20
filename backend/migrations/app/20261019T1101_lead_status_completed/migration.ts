#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/f70635337f9fa84ce0349340adef59b5bad49bf2a1d75db6b75b70086e8787eb/contract';
import endContract from '../../snapshots/f70635337f9fa84ce0349340adef59b5bad49bf2a1d75db6b75b70086e8787eb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fc528ca90465185c04a3bb59168ae73cd2a947b806dd734bd8582b4ebb09a6fc/contract';
import startContract from '../../snapshots/fc528ca90465185c04a3bb59168ae73cd2a947b806dd734bd8582b4ebb09a6fc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Document',
        constraint: 'Document_status_check_1d1d9eee',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Lead',
        constraint: 'Lead_status_check_1d1d9eee',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_fromStatus_check_270765ff',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_toStatus_check_689ba99c',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Document',
        constraint: 'Document_status_check_19b95927',
        expression:
          "\"status\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS', 'COMPLETED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Lead',
        constraint: 'Lead_status_check_19b95927',
        expression:
          "\"status\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS', 'COMPLETED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_fromStatus_check_fddf8cfd',
        expression:
          "\"fromStatus\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS', 'COMPLETED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'LeadStatusHistory',
        constraint: 'LeadStatusHistory_toStatus_check_5fc3f8d6',
        expression:
          "\"toStatus\" IN ('ENQUIRY', 'QUOTATION', 'CUTSHEET', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'ACCOUNTS', 'COMPLETED')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
