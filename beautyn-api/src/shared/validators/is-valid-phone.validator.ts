import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Constants for phone number validation
export const INTERNATIONAL_PREFIX = '+';
export const PHONE_VALIDATOR_NAME = 'isValidPhone';

/**
 * Custom validator for international phone numbers using libphonenumber-js
 * Focuses on Ukrainian numbers but accepts all valid international numbers
 * Uses Google's libphonenumber database for accurate validation
 */
export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: PHONE_VALIDATOR_NAME,
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'string') {
            return true; // Let other validators handle empty/non-string values
          }

          // Must start with + (international format)
          if (!value.startsWith(INTERNATIONAL_PREFIX)) {
            return false;
          }

          try {
            // Use libphonenumber-js for validation
            if (!isValidPhoneNumber(value)) {
              return false;
            }

            // Parse the phone number to get more details
            const phoneNumber = parsePhoneNumber(value);
            
            // Ensure the parsed number is valid
            return phoneNumber && phoneNumber.isValid();
          } catch (error) {
            return false; // Invalid phone number format
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number in international format (e.g., ${INTERNATIONAL_PREFIX}380501234567 for Ukraine)`;
        },
      },
    });
  };
}
