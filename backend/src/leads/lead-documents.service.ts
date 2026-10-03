import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import path from 'node:path';
import type { PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FileStorageService, type UploadedFileData } from './file-storage.service.js';
import { LeadAccessService } from './lead-access.service.js';
import {
  DEPARTMENT_BY_ROLE,
  hasRole,
  iso,
  must,
  PICK_DEPARTMENT_ROLES,
  toUserRef,
  USER_REF_FIELDS,
  type Department,
  type LeadDocumentDto,
  type UserRefDto,
} from './leads.types.js';

/**
 * Files attached to a lead. Each department has its own folder:
 *   uploads/leads/<leadId>/<department>/<random-id>.<ext>
 * e.g. a sales person's quotation lands in uploads/leads/12/sales/.
 */
@Injectable()
export class LeadDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LeadAccessService,
    private readonly storage: FileStorageService,
  ) {}

  async list(leadId: number, user: PublicUser, department?: Department): Promise<LeadDocumentDto[]> {
    await this.access.getViewable(leadId, user);

    let docs = this.prisma.orm.public.Document.where({ leadId }).include('uploadedBy', (u) =>
      u.select(...USER_REF_FIELDS),
    );
    if (department) docs = docs.where({ department });

    const rows = await docs.orderBy([(d) => d.createdAt.desc(), (d) => d.id.desc()]).all();
    return rows.map(toDocumentDto);
  }

  /** Only users currently assigned to the lead (and admins) can upload */
  async upload(
    leadId: number,
    file: UploadedFileData | undefined,
    requestedDepartment: Department | undefined,
    user: PublicUser,
  ): Promise<LeadDocumentDto> {
    if (!file) throw new BadRequestException('Please choose a file to upload.');

    const lead = await this.access.getViewable(leadId, user);
    if (user.role !== 'ADMIN' && !(await this.access.isActiveAssignee(leadId, user.id))) {
      throw new ForbiddenException('Only users currently assigned to this lead can upload files.');
    }

    const department = this.departmentFor(user, requestedDepartment);
    const stored = await this.storage.save(`leads/${leadId}/${department.toLowerCase()}`, file);

    try {
      const created = await this.prisma.orm.public.Document.select('id').create({
        leadId,
        status: lead.status,
        department,
        originalName: cleanName(file.originalname),
        fileName: stored.fileName,
        filePath: stored.relativePath,
        extension: stored.extension,
        mimeType: file.mimetype || null,
        fileSize: BigInt(file.size),
        uploadedById: user.id,
      });
      return this.findOne(leadId, created.id);
    } catch (err) {
      // Don't leave an orphan file on disk if the database insert failed
      await this.storage.remove(stored.relativePath);
      throw err;
    }
  }

  /** The file stream plus what the browser needs to save it under its original name */
  async download(leadId: number, documentId: number, user: PublicUser) {
    await this.access.getViewable(leadId, user);

    const doc = await this.prisma.orm.public.Document.select('filePath', 'originalName', 'mimeType', 'fileSize')
      .where({ id: documentId, leadId })
      .first();
    if (!doc) throw new NotFoundException('File not found.');

    const stream = await this.storage.open(doc.filePath);
    if (!stream) throw new NotFoundException('This file is missing from the server.');

    return {
      stream,
      originalName: doc.originalName,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      size: doc.fileSize === null ? undefined : Number(doc.fileSize),
    };
  }

  /** The uploader or an admin can delete a file */
  async remove(leadId: number, documentId: number, user: PublicUser): Promise<void> {
    await this.access.getViewable(leadId, user);

    const doc = await this.prisma.orm.public.Document.select('id', 'filePath', 'uploadedById')
      .where({ id: documentId, leadId })
      .first();
    if (!doc) throw new NotFoundException('File not found.');
    if (user.role !== 'ADMIN' && doc.uploadedById !== user.id) {
      throw new ForbiddenException('Only the person who uploaded this file or an admin can delete it.');
    }

    await this.prisma.orm.public.Document.where({ id: doc.id }).delete();
    await this.storage.remove(doc.filePath);
  }

  private async findOne(leadId: number, id: number): Promise<LeadDocumentDto> {
    const doc = await this.prisma.orm.public.Document.where({ id, leadId })
      .include('uploadedBy', (u) => u.select(...USER_REF_FIELDS))
      .first();
    if (!doc) throw new NotFoundException('File not found.');
    return toDocumentDto(doc);
  }

  /** Department users always upload into their own folder; admins/managers pick one (default ADMIN) */
  private departmentFor(user: PublicUser, requested: Department | undefined): Department {
    if (hasRole(user, PICK_DEPARTMENT_ROLES)) return requested ?? 'ADMIN';

    const own = DEPARTMENT_BY_ROLE[user.role];
    if (!own) throw new ForbiddenException('Your role does not have a department folder to upload into.');
    if (requested && requested !== own) {
      throw new BadRequestException(`You can only upload into the ${own.toLowerCase()} folder.`);
    }
    return own;
  }
}

function toDocumentDto(d: {
  id: number;
  department: Department;
  status: LeadDocumentDto['status'];
  originalName: string;
  extension: string | null;
  mimeType: string | null;
  fileSize: number | bigint | null;
  createdAt: { toString(): string };
  uploadedBy: UserRefDto | null;
}): LeadDocumentDto {
  return {
    id: d.id,
    department: d.department,
    status: d.status,
    originalName: d.originalName,
    extension: d.extension,
    mimeType: d.mimeType,
    fileSize: d.fileSize === null ? null : Number(d.fileSize),
    uploadedBy: toUserRef(must(d.uploadedBy)),
    createdAt: iso(d.createdAt),
  };
}

/** Keep just the file name, without folders or control characters, max 255 chars */
function cleanName(name: string): string {
  // oxlint-disable-next-line no-control-regex -- stripping control characters is the point
  const base = path.basename(name.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (base || 'file').slice(0, 255);
}
