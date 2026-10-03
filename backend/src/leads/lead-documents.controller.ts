import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import type { UploadedFileData } from './file-storage.service.js';
import { LeadDocumentsService } from './lead-documents.service.js';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

@Controller('leads/:id/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadDocumentsController {
  constructor(private readonly documents: LeadDocumentsService) {}

  /** ?department=SALES shows one folder */
  @Get()
  async list(@Param('id', ParseIntPipe) id: number, @Query() query: UploadDocumentDto, @CurrentUser() user: PublicUser) {
    return { documents: await this.documents.list(id, user, query.department) };
  }

  /** multipart/form-data: `file` (required) and `department` (admins/managers only) */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedFileData | undefined,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: PublicUser,
  ) {
    return { document: await this.documents.upload(id, file, dto.department, user) };
  }

  @Get(':documentId/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @CurrentUser() user: PublicUser,
  ) {
    const file = await this.documents.download(id, documentId, user);
    // Always "attachment": an uploaded HTML/SVG file must never render inside our site
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.size,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    });
  }

  @Delete(':documentId')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @CurrentUser() user: PublicUser,
  ) {
    await this.documents.remove(id, documentId, user);
    return { message: 'File deleted.' };
  }
}
