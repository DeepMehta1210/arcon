import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ValidateNested, IsOptional, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { SendMessageDto } from "./send-message.dto";

export class BulkQueueDto {
  @ApiProperty({
    type: [SendMessageDto],
    description: "Array of recipients and personalized messages to queue with Gaussian anti-ban pacing",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendMessageDto)
  messages: SendMessageDto[];

  @ApiProperty({
    description: "Minimum random jitter delay between messages in seconds",
    default: 45,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minJitterSec?: number;

  @ApiProperty({
    description: "Maximum random jitter delay between messages in seconds",
    default: 90,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxJitterSec?: number;
}
