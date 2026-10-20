#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6d6f24dcadbc3ef4a0a44ea4132f72d58e235645844bd0133119f2bef288c7fa/contract';
import endContract from '../../snapshots/6d6f24dcadbc3ef4a0a44ea4132f72d58e235645844bd0133119f2bef288c7fa/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'ChatMessage',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Client',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('alternateMobile', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mobile', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Document',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('department', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('extension', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('filePath', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mimeType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('originalName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploadedById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Document_department_check_1c4f5751',
            "\"department\" IN ('ADMIN', 'SALES', 'DESIGN', 'PURCHASE', 'PRODUCTION', 'ACCOUNTS', 'DISPATCH')",
          ),
          checkExpression(
            'Document_status_check_78e33087',
            "\"status\" IN ('ENQUIRY', 'QUOTATION', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'INVOICE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Lead',
        columns: [
          col('assignedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('chatClosed', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('chatClosedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('chatClosedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('clientId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastUpdatedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('projectName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ENQUIRY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Lead_status_check_78e33087',
            "\"status\" IN ('ENQUIRY', 'QUOTATION', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'INVOICE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'LeadStatusHistory',
        columns: [
          col('assignedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('assignedToId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('changedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('changedById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LeadStatusHistory_fromStatus_check_7ac22622',
            "\"fromStatus\" IN ('ENQUIRY', 'QUOTATION', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'INVOICE')",
          ),
          checkExpression(
            'LeadStatusHistory_toStatus_check_22392df3',
            "\"toStatus\" IN ('ENQUIRY', 'QUOTATION', 'OPTIMISATION', 'PURCHASE', 'PRODUCTION', 'DISPATCH', 'INVOICE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'LeadUser',
        columns: [
          col('assignedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('assignedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('COLLABORATOR'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('unassignedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LeadUser_role_check_e2e0a9f2',
            "\"role\" IN ('PRIMARY', 'COLLABORATOR')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mobile', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'User_role_check_b6eade79',
            "\"role\" IN ('ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PURCHASE', 'PRODUCTION', 'ACCOUNTS', 'DISPATCH', 'USER')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'LeadUser',
        constraint: 'LeadUser_leadId_userId_key',
        columns: ['leadId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChatMessage',
        index: 'ChatMessage_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChatMessage',
        index: 'ChatMessage_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChatMessage',
        index: 'ChatMessage_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Client',
        index: 'Client_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Client',
        index: 'Client_mobile_idx_5e13aa01',
        columns: ['mobile'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_department_idx_1676f947',
        columns: ['department'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_uploadedById_idx_b92fad21',
        columns: ['uploadedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_assignedById_idx_f5db02c3',
        columns: ['assignedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_chatClosedById_idx_b8facda2',
        columns: ['chatClosedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_lastUpdatedById_idx_a82dd7fc',
        columns: ['lastUpdatedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadStatusHistory',
        index: 'LeadStatusHistory_assignedById_idx_f5db02c3',
        columns: ['assignedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadStatusHistory',
        index: 'LeadStatusHistory_assignedToId_idx_45a131c2',
        columns: ['assignedToId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadStatusHistory',
        index: 'LeadStatusHistory_changedAt_idx_627a12db',
        columns: ['changedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadStatusHistory',
        index: 'LeadStatusHistory_changedById_idx_d6e6aadb',
        columns: ['changedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadStatusHistory',
        index: 'LeadStatusHistory_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadUser',
        index: 'LeadUser_assignedById_idx_f5db02c3',
        columns: ['assignedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadUser',
        index: 'LeadUser_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadUser',
        index: 'LeadUser_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_role_idx_2c1ddf83',
        columns: ['role'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChatMessage',
        foreignKey: {
          name: 'ChatMessage_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChatMessage',
        foreignKey: {
          name: 'ChatMessage_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_uploadedById_fkey',
          columns: ['uploadedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_assignedById_fkey',
          columns: ['assignedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_lastUpdatedById_fkey',
          columns: ['lastUpdatedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_chatClosedById_fkey',
          columns: ['chatClosedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadStatusHistory',
        foreignKey: {
          name: 'LeadStatusHistory_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadStatusHistory',
        foreignKey: {
          name: 'LeadStatusHistory_changedById_fkey',
          columns: ['changedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadStatusHistory',
        foreignKey: {
          name: 'LeadStatusHistory_assignedById_fkey',
          columns: ['assignedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadStatusHistory',
        foreignKey: {
          name: 'LeadStatusHistory_assignedToId_fkey',
          columns: ['assignedToId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadUser',
        foreignKey: {
          name: 'LeadUser_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadUser',
        foreignKey: {
          name: 'LeadUser_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadUser',
        foreignKey: {
          name: 'LeadUser_assignedById_fkey',
          columns: ['assignedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
