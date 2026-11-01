import { Controller, Get, Post, Body, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EngineFactory } from "../core/engines/engine.factory";
import { PairPhoneDto } from "../dtos/pair-phone.dto";

@ApiTags("Authentication")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly engineFactory: EngineFactory) {}

  @Get("status")
  @ApiOperation({ summary: "Get WhatsApp Gateway session status" })
  getStatus() {
    const engine = this.engineFactory.getEngine();
    return {
      engine: engine.name,
      status: engine.getStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("qr")
  @ApiOperation({ summary: "Get active QR code to link device via WhatsApp camera" })
  @ApiResponse({ status: 200, description: "Active QR Code returned" })
  @ApiResponse({ status: 404, description: "No active QR code (already connected or initializing)" })
  async getQr() {
    const engine = this.engineFactory.getEngine();
    const qrData = await engine.getQrCode();

    if (!qrData) {
      throw new HttpException(
        {
          status: engine.getStatus(),
          message: "No active QR code. Gateway is either already connected or initializing.",
        },
        HttpStatus.NOT_FOUND
      );
    }

    return qrData;
  }

  @Post("pair-phone")
  @ApiOperation({
    summary: "Request an 8-digit Pairing Code (Link with phone number instead of scanning QR)",
  })
  async pairPhone(@Body() dto: PairPhoneDto) {
    const engine = this.engineFactory.getEngine();
    try {
      const result = await engine.pairWithPhoneNumber(dto.phone);
      return {
        phone: dto.phone,
        pairingCode: result.pairingCode,
        instruction: "Open WhatsApp > Linked Devices > Link with Phone Number, then enter this code.",
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post("logout")
  @ApiOperation({ summary: "Disconnect WhatsApp session and clear active keys" })
  async logout() {
    const engine = this.engineFactory.getEngine();
    await engine.logout();
    return {
      status: "LOGGED_OUT",
      message: "Session closed successfully.",
      timestamp: new Date().toISOString(),
    };
  }
}
