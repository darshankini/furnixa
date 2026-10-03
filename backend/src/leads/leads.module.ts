import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { FileStorageService } from './file-storage.service.js';
import { LeadAccessService } from './lead-access.service.js';
import { LeadChatController } from './lead-chat.controller.js';
import { LeadChatService } from './lead-chat.service.js';
import { LeadDocumentsController } from './lead-documents.controller.js';
import { LeadDocumentsService } from './lead-documents.service.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard + JwtService
  controllers: [LeadsController, LeadChatController, LeadDocumentsController],
  providers: [LeadsService, LeadChatService, LeadDocumentsService, LeadAccessService, FileStorageService, RolesGuard],
})
export class LeadsModule {}
