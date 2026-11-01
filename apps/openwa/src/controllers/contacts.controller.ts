import { Controller, Get, Param, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { EngineFactory } from "../core/engines/engine.factory";
import { NumberValidatorService } from "../core/anti-ban/number-validator.service";

@ApiTags("Contacts & Numbers")
@Controller("api/v1/contacts")
export class ContactsController {
  constructor(
    private readonly engineFactory: EngineFactory,
    private readonly numberValidator: NumberValidatorService
  ) {}

  @Get("check/:phone")
  @ApiOperation({
    summary: "Check if a phone number exists on WhatsApp and validate mobile range (+91)",
  })
  @ApiParam({ name: "phone", example: "+919825012345" })
  async checkContact(@Param("phone") phone: string) {
    const formatted = this.numberValidator.format(phone);
    const engine = this.engineFactory.getEngine();

    if (engine.getStatus() !== "CONNECTED") {
      return {
        phone: formatted.e164,
        exists: formatted.isValidMobile,
        isIndianMobile: formatted.isIndian && formatted.isValidMobile,
        warning: "Gateway is not connected to WhatsApp socket. Result based on mobile prefix regex only.",
      };
    }

    try {
      const result = await engine.checkContactExists(phone);
      return {
        ...result,
        isIndianMobile: formatted.isIndian && formatted.isValidMobile,
      };
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
