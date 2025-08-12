import { validate } from 'class-validator';
import { IsValidPhone, INTERNATIONAL_PREFIX } from './is-valid-phone.validator';

class TestDto {
  @IsValidPhone()
  phone?: string;
}

describe('IsValidPhone (Ukrainian + International)', () => {
  it('should pass validation for valid Ukrainian phone numbers', async () => {
    const validUkrainianPhones = [
      '+380501234567',   // Mobile - Kyivstar
      '+380671234567',   // Mobile - Vodafone  
      '+380931234567',   // Mobile - Lifecell
      '+380442345678',   // Landline - Kyiv
      '+380322345678',   // Landline - Lviv
      '+380482345678',   // Landline - Odesa
      '+380391234567',   // Mobile - PEOPLEnet
      '+380631234567',   // Mobile - 3mob
    ];

    for (const phone of validUkrainianPhones) {
      const dto = new TestDto();
      dto.phone = phone;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should pass validation for valid international phone numbers', async () => {
    const validInternationalPhones = [
      '+12025551234',        // USA (Washington DC)
      '+442071234567',       // UK (London)
      '+4930123456789',      // Germany (Berlin)  
      '+33142123456',        // France (Paris)
      '+81312345678',        // Japan (Tokyo)
      '+61212345678',        // Australia (Sydney)
      '+971501234567',       // UAE (Dubai)
      '+4915112345678',      // Germany mobile
    ];

    for (const phone of validInternationalPhones) {
      const dto = new TestDto();
      dto.phone = phone;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail validation for invalid phone numbers', async () => {
    const invalidPhones = [
      { phone: '380501234567', reason: 'Missing international prefix' },
      { phone: INTERNATIONAL_PREFIX, reason: 'Just the international prefix' },
      { phone: '+123', reason: 'Too short' },
      { phone: '+1234567890123456', reason: 'Too long (>15 digits)' },
      { phone: '+380abc123456', reason: 'Contains letters' },
      { phone: 'invalid', reason: 'Not a number at all' },
      { phone: '+999123456789', reason: 'Invalid country code (999)' },
      { phone: '+0123456789', reason: 'Starts with 0 (invalid country code)' },
    ];

    for (const { phone, reason } of invalidPhones) {
      const dto = new TestDto();
      dto.phone = phone;
      
      const errors = await validate(dto);
      
      // Check that invalid phone numbers are properly rejected
      if (errors.length === 0) {
        throw new Error(`Expected ${phone} to be invalid (${reason}), but it passed validation`);
      }
      expect(errors[0].constraints?.isValidPhone).toContain('must be a valid phone number');
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

  it('should validate different Ukrainian operators', async () => {
    const operatorExamples = [
      { operator: 'Kyivstar', phone: '+380501234567' },
      { operator: 'Vodafone', phone: '+380661234567' },
      { operator: 'Lifecell', phone: '+380931234567' },
      { operator: 'PEOPLEnet', phone: '+380391234567' },
      { operator: '3mob', phone: '+380631234567' },
      { operator: 'Kyiv landline', phone: '+380442345678' },
      { operator: 'Lviv landline', phone: '+380322345678' },
    ];

    for (const example of operatorExamples) {
      const dto = new TestDto();
      dto.phone = example.phone;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
