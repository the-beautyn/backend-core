import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Custom validator to check if a phone number is valid using libphonenumber-js
 * Supports all international phone number formats
 */
export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'string') {
            return true; // Let other validators handle empty/non-string values
          }

          try {
            // Check if the phone number is valid
            if (!isValidPhoneNumber(value)) {
              return false;
            }

            // Parse the phone number to get more details
            const phoneNumber = parsePhoneNumber(value);
            
            // Ensure it's in international format (starts with +)
            if (!value.startsWith('+')) {
              return false;
            }

            // Ensure the parsed number is valid
            return phoneNumber && phoneNumber.isValid();
          } catch (error) {
            return false; // Invalid phone number format
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number in international format (e.g., +1234567890)`;
        },
      },
    });
  };
}
