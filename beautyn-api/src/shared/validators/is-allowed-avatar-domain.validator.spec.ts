import { validate } from 'class-validator';
import { IsAllowedAvatarDomain } from './is-allowed-avatar-domain.validator';

class TestDto {
  @IsAllowedAvatarDomain()
  avatarUrl?: string;
}

describe('IsAllowedAvatarDomain', () => {
  it('should pass validation for allowed domains', async () => {
    const validUrls = [
      'https://example.supabase.co/avatar.jpg',
      'https://avatars.githubusercontent.com/user/123',
      'https://www.gravatar.com/avatar/hash',
      'https://lh3.googleusercontent.com/photo.jpg',
      'https://graph.facebook.com/user/picture',
      'https://cdn.cloudflare.com/image.png',
      'https://bucket.amazonaws.com/avatar.jpg',
      'https://res.cloudinary.com/cloud/image.jpg',
      'https://i.imgur.com/image.png',
      'https://images.unsplash.com/photo.jpg',
    ];

    for (const url of validUrls) {
      const dto = new TestDto();
      dto.avatarUrl = url;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should fail validation for disallowed domains', async () => {
    const invalidUrls = [
      'https://malicious.com/avatar.jpg',
      'https://untrusted-site.net/image.png',
      'https://random-domain.org/photo.jpg',
      'https://suspicious.website/avatar.gif',
    ];

    for (const url of invalidUrls) {
      const dto = new TestDto();
      dto.avatarUrl = url;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isAllowedAvatarDomain).toContain('must be hosted on an allowed domain');
    }
  });

  it('should pass validation for empty values', async () => {
    const emptyValues = [undefined, null, ''];

    for (const value of emptyValues) {
      const dto = new TestDto();
      dto.avatarUrl = value as any;
      
      const errors = await validate(dto);
      // Should not fail on empty values (let other validators handle this)
      const avatarErrors = errors.filter(error => 
        error.constraints?.isAllowedAvatarDomain
      );
      expect(avatarErrors).toHaveLength(0);
    }
  });

  it('should fail validation for invalid URLs', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com/file.jpg',
      'javascript:alert("xss")',
      'data:image/jpeg;base64,/9j/4AAQ...',
    ];

    for (const url of invalidUrls) {
      const dto = new TestDto();
      dto.avatarUrl = url;
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('should pass validation for subdomains of allowed domains', async () => {
    const subdomainUrls = [
      'https://storage.googleapis.com/bucket/avatar.jpg',
      'https://cdn.supabase.co/image.png',
      'https://subdomain.cloudinary.com/photo.jpg',
    ];

    for (const url of subdomainUrls) {
      const dto = new TestDto();
      dto.avatarUrl = url;
      
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });
});
