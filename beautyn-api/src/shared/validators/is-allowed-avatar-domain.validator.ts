import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// Define allowed avatar domains
const ALLOWED_AVATAR_DOMAINS = [
  'supabase.co',
  'supabase.com', 
  'githubusercontent.com',
  'gravatar.com',
  'googleapis.com',
  'googleusercontent.com',
  'facebook.com',
  'fbcdn.net',
  'cloudflare.com',
  'amazonaws.com',
  'cloudinary.com',
  'imgur.com',
  'unsplash.com',
  // Add more allowed domains as needed
];

/**
 * Custom validator to check if an avatar URL is from an allowed domain
 */
export function IsAllowedAvatarDomain(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAllowedAvatarDomain',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'string') {
            return true; // Let other validators handle empty/non-string values
          }

          try {
            const url = new URL(value);
            const hostname = url.hostname.toLowerCase();
            
            // Check if the hostname or any parent domain is in the allowed list
            return ALLOWED_AVATAR_DOMAINS.some(allowedDomain => {
              return hostname === allowedDomain || hostname.endsWith('.' + allowedDomain);
            });
          } catch (error) {
            return false; // Invalid URL format
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be hosted on an allowed domain. Allowed domains: ${ALLOWED_AVATAR_DOMAINS.join(', ')}`;
        },
      },
    });
  };
}
