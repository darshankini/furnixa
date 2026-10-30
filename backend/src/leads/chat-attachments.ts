/** The request is held in memory while it is saved; same 20 MB limit as lead files */
export const MAX_CHAT_UPLOAD_BYTES = 20 * 1024 * 1024;

export type ChatAttachmentKind = 'image' | 'video' | 'file';

interface AllowedType {
  kind: ChatAttachmentKind;
  /** What we send back as Content-Type, never the type the browser claimed on upload */
  mimeType: string;
}

/**
 * The only file types the chat accepts, keyed by lowercase extension.
 * Images and videos are shown inline in the chat; everything else is offered as a download.
 */
export const CHAT_ALLOWED_TYPES: Record<string, AllowedType> = {
  png: { kind: 'image', mimeType: 'image/png' },
  jpg: { kind: 'image', mimeType: 'image/jpeg' },
  jpeg: { kind: 'image', mimeType: 'image/jpeg' },
  gif: { kind: 'image', mimeType: 'image/gif' },
  webp: { kind: 'image', mimeType: 'image/webp' },
  mp4: { kind: 'video', mimeType: 'video/mp4' },
  m4v: { kind: 'video', mimeType: 'video/mp4' },
  mov: { kind: 'video', mimeType: 'video/quicktime' },
  webm: { kind: 'video', mimeType: 'video/webm' },
  pdf: { kind: 'file', mimeType: 'application/pdf' },
  txt: { kind: 'file', mimeType: 'text/plain; charset=utf-8' },
  csv: { kind: 'file', mimeType: 'text/csv; charset=utf-8' },
  xls: { kind: 'file', mimeType: 'application/vnd.ms-excel' },
  xlsx: { kind: 'file', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

export const CHAT_ALLOWED_EXTENSIONS = Object.keys(CHAT_ALLOWED_TYPES);

/** null when the extension is missing or not on the list */
export function chatTypeFor(extension: string | null): AllowedType | null {
  return extension ? (CHAT_ALLOWED_TYPES[extension.toLowerCase()] ?? null) : null;
}
