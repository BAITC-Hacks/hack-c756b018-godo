import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteActivityDto {
  @ApiProperty({ example: 'EVT_SYS_01', description: 'ID пройденой активности' })
  @IsString()
  @IsNotEmpty()
  eventId: string;
}
