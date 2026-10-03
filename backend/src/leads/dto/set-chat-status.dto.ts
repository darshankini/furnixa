import { IsBoolean } from 'class-validator';

export class SetChatStatusDto {
  /** true closes the chat, false reopens it */
  @IsBoolean({ message: 'closed must be true or false.' })
  closed: boolean;
}
