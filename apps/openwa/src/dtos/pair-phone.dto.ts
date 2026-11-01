import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class PairPhoneDto {
  @ApiProperty({
    description: "Your WhatsApp phone number to generate an 8-character pairing code (no QR scan needed)",
    example: "+919825012345",
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
