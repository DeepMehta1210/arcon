import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class GaussianJitterService {
  private readonly logger = new Logger(GaussianJitterService.name);

  /**
   * Generates a random number following a Gaussian (normal) distribution
   * using the Box-Muller transform, bounded between min and max.
   */
  getGaussianDelaySec(minSec = 45, maxSec = 90): number {
    const u1 = Math.random();
    const u2 = Math.random();
    // Standard normal distribution (mean = 0, stdDev = 1)
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Map to custom mean and stdDev
    const mean = (minSec + maxSec) / 2;
    const stdDev = (maxSec - minSec) / 6; // 99.7% of values fall within [min, max]
    let result = mean + z0 * stdDev;

    // Clamp between min and max
    result = Math.max(minSec, Math.min(maxSec, result));
    return Math.round(result);
  }

  /**
   * Simulates realistic human typing duration based on character count.
   * Roughly 30ms to 45ms per character with random micro-hesitations.
   */
  getTypingDurationMs(textLength: number, msPerChar = 35): number {
    const baseDuration = textLength * msPerChar;
    const hesitation = Math.floor(Math.random() * 800) + 200; // 200ms - 1000ms pause
    // Cap between 2 seconds and 6 seconds max
    return Math.min(6000, Math.max(2000, baseDuration + hesitation));
  }

  /**
   * Sleep helper
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
