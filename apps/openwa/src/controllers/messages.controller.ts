import { Controller, Post, Body, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EngineFactory } from "../core/engines/engine.factory";
import { GaussianJitterService } from "../core/anti-ban/gaussian-jitter.service";
import { SendMessageDto } from "../dtos/send-message.dto";
import { BulkQueueDto } from "../dtos/queue-message.dto";

@ApiTags("Messages")
@Controller("api/v1/messages")
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly engineFactory: EngineFactory,
    private readonly jitterService: GaussianJitterService
  ) {}

  @Post("send")
  @ApiOperation({
    summary: "Send a single personalized WhatsApp message with typing simulation and byte-hash mutation",
  })
  @ApiResponse({ status: 200, description: "Message dispatched or queued successfully" })
  async sendMessage(@Body() dto: SendMessageDto) {
    const engine = this.engineFactory.getEngine();

    try {
      const result = await engine.sendMessage(dto.phone, dto.text, {
        simulateTyping: dto.simulateTyping ?? true,
        applySpintax: dto.applySpintax ?? true,
      });

      return {
        success: true,
        recipient: dto.phone,
        messageId: result.messageId,
        status: result.status,
        timestamp: result.timestamp,
        antiBanApplied: {
          typingPresenceMs: result.jitterAppliedMs,
          byteHashMutated: dto.applySpintax ?? true,
        },
      };
    } catch (err) {
      throw new HttpException(
        {
          success: false,
          error: (err as Error).message,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post("bulk-queue")
  @ApiOperation({
    summary: "Queue multiple messages with Gaussian (bell-curve) anti-ban delays between sends",
  })
  async queueBatch(@Body() dto: BulkQueueDto) {
    const minSec = dto.minJitterSec ?? 45;
    const maxSec = dto.maxJitterSec ?? 90;
    const count = dto.messages.length;

    this.logger.log(`Received bulk dispatch request for ${count} recipients (Jitter range: ${minSec}s - ${maxSec}s)`);

    // Async background processing with Gaussian distribution delay
    const engine = this.engineFactory.getEngine();
    (async () => {
      for (let i = 0; i < dto.messages.length; i++) {
        const item = dto.messages[i];
        try {
          await engine.sendMessage(item.phone, item.text, {
            simulateTyping: item.simulateTyping ?? true,
            applySpintax: item.applySpintax ?? true,
          });
          this.logger.log(`Dispatched item ${i + 1}/${count} to ${item.phone}`);
        } catch (e) {
          this.logger.error(`Failed sending to ${item.phone}: ${(e as Error).message}`);
        }

        // Apply Gaussian pacing between consecutive outbound messages if more remain
        if (i < dto.messages.length - 1) {
          const delaySec = this.jitterService.getGaussianDelaySec(minSec, maxSec);
          this.logger.log(`Pacing next message with Gaussian delay: ${delaySec}s`);
          await this.jitterService.sleep(delaySec * 1000);
        }
      }
    })().catch((err) => this.logger.error(`Bulk queue execution error: ${err.message}`));

    return {
      status: "queued",
      totalMessages: count,
      estimatedCompletionMinutes: Math.round((count * ((minSec + maxSec) / 2)) / 60),
      message: "Messages queued into background worker with Gaussian anti-ban pacing.",
    };
  }
}
