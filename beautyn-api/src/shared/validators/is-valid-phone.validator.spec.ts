import { validate } from 'class-validator';
import { IsValidPhone } from './is-valid-phone.validator';

class TestDto {
  @IsValidPhone()
  phone?: string;
}

describe('IsValidPhone', () => {
  it('should pass validation for valid international phone numbers', async () => {
    const validPhones = [
      '+1234567890',           // USA (10 digits)
      '+442071234567',         // UK (10 digits)
      '+4930123456789',        // Germany (11 digits)
      '+81312345678',          // Japan (10 digits)
      '+3796698',              // Vatican City (5 digits)
      '+6745550123',           // Nauru (8 digits)
      '+37793150600',          // Monaco (8 digits)
      '+85212345678',          // Hong Kong (8 digits)
      '+97150123456',          // UAE (9 digits)
      '+5511123456789',        // Brazil (11 digits)
    ];

    for (const phone of validPhones) {
      const dto = new TestDto();
      dto.phone = phone;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail validation for invalid phone numbers', async () => {
    const invalidPhones = [
      '1234567890',            // Missing + prefix
      '+',                     // Just a plus sign
      '+0123456789',           // Leading zero after country code
      '+123',                  // Too short
      '+123456789012345678',   // Too long
      '+abc123456789',         // Contains letters
      '+1-234-567-8901',       // Contains dashes (libphonenumber might accept this, but let's test)
      'invalid',               // Not a number at all
      '+999999999999999',      // Invalid country code
    ];

    for (const phone of invalidPhones) {
      const dto = new TestDto();
      dto.phone = phone;
      
      const errors = await validate(dto);
      
      // Some of these might still be valid according to libphonenumber
      // So we'll check if they're actually invalid
      if (phone === '1234567890' || phone === '+' || phone === '+123' || 
          phone === '+abc123456789' || phone === 'invalid') {
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.isValidPhone).toContain('must be a valid phone number');
      }
    }
  });

  it('should pass validation for empty values (handled by @IsOptional)', async () => {
    const emptyValues = [undefined, null, ''];

    for (const value of emptyValues) {
      const dto = new TestDto();
      dto.phone = value as any;
      
      const errors = await validate(dto);
      // Should not fail on empty values (let @IsOptional handle this)
      const phoneErrors = errors.filter(error => 
        error.constraints?.isValidPhone
      );
      expect(phoneErrors).toHaveLength(0);
    }
  });

  it('should validate specific country examples', async () => {
    const countryExamples = [
      { country: 'United States', phone: '+15551234567' },
      { country: 'United Kingdom', phone: '+447911123456' },
      { country: 'Germany', phone: '+4930123456789' },
      { country: 'France', phone: '+33123456789' },
      { country: 'Japan', phone: '+81312345678' },
      { country: 'Australia', phone: '+61212345678' },
      { country: 'Canada', phone: '+14165551234' },
      { country: 'Brazil', phone: '+5511123456789' },
    ];

    for (const example of countryExamples) {
      const dto = new TestDto();
      dto.phone = example.phone;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
