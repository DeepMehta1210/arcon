import { Injectable, BadRequestException } from "@nestjs/common";

export interface FormattedPhone {
  raw: string;
  cleanDigits: string;
  e164: string;
  jid: string;
  isIndian: boolean;
  isValidMobile: boolean;
}

@Injectable()
export class NumberValidatorService {
  /**
   * Formats and validates phone numbers, with special support for Indian mobile ranges (+91 6-9xxxxxxxxx).
   */
  format(phone: string): FormattedPhone {
    if (!phone) {
      throw new BadRequestException("Phone number is required");
    }

    let cleanDigits = phone.replace(/[^\d]/g, "");

    // Handle Indian number formats
    let isIndian = false;
    let isValidMobile = false;

    // If starts with 0 and 11 digits (e.g. 09825012345) -> strip leading 0, prepend 91
    if (cleanDigits.startsWith("0") && cleanDigits.length === 11) {
      cleanDigits = `91${cleanDigits.slice(1)}`;
    }

    // If 10 digits starting with 6, 7, 8, or 9 -> assume Indian mobile and prepend 91
    if (cleanDigits.length === 10 && /^[6789]/.test(cleanDigits)) {
      cleanDigits = `91${cleanDigits}`;
      isIndian = true;
      isValidMobile = true;
    } else if (cleanDigits.startsWith("91") && cleanDigits.length === 12) {
      isIndian = true;
      const subscriberPart = cleanDigits.slice(2);
      isValidMobile = /^[6789]/.test(subscriberPart);
    } else if (cleanDigits.length >= 10 && cleanDigits.length <= 15) {
      isValidMobile = true;
    }

    const e164 = `+${cleanDigits}`;
    const jid = `${cleanDigits}@s.whatsapp.net`;

    return {
      raw: phone,
      cleanDigits,
      e164,
      jid,
      isIndian,
      isValidMobile,
    };
  }
}
