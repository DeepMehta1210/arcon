import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from "class-validator";

export class SendMessageDto {
  @ApiProperty({
    description: "Recipient phone number (E.164 e.g. +919825012345 or 10-digit Indian mobile 9825012345)",
    example: "+919825012345",
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: "Message content. Supports Spintax e.g. {Namaste|Hello} team",
    example: "{Namaste|Hello} team, quick question about your services.",
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: "Simulate natural human typing indicator before dispatching (2.5s - 5s)",
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  simulateTyping?: boolean;

  @ApiProperty({
    description: "Mutate cryptographic byte-hash with invisible zero-width unicode to bypass Meta ML duplicate filters",
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  applySpintax?: boolean;
}
