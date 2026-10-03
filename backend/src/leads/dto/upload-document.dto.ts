import { IsIn, IsOptional } from 'class-validator';
import { DEPARTMENTS, type Department } from '../leads.types.js';

/** Sent as multipart/form-data next to the `file` field */
export class UploadDocumentDto {
  /** Only admins and managers choose the folder; everyone else uploads into their own department's folder */
  @IsOptional()
  @IsIn(DEPARTMENTS, { message: 'Please choose a valid department.' })
  department?: Department;
}
