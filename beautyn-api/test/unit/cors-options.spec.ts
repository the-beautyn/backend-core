import { ConfigService } from '@nestjs/config';
import { corsOptionsFromConfig } from '../../src/shared/utils/cors-options.util';

describe('corsOptionsFromConfig', () => {
  const configWith = (values: Record<string, string | undefined>) =>
    ({ get: jest.fn((key: string) => values[key]) }) as unknown as ConfigService;

  it('parses comma-separated origins, trimming and dropping empty entries', () => {
    const options = corsOptionsFromConfig(
      configWith({
        CORS_ALLOWED_ORIGINS: ' https://panel.example.com , ,https://panel-stage.example.com,',
        NODE_ENV: 'production',
      }),
    );
    expect(options.origin).toEqual([
      'https://panel.example.com',
      'https://panel-stage.example.com',
    ]);
  });

  it('falls back to local Vite origins when unset outside production', () => {
    const options = corsOptionsFromConfig(configWith({ NODE_ENV: 'local' }));
    expect(options.origin).toEqual(['http://localhost:5173', 'http://localhost:4173']);
  });

  it('stays closed (origin: false) when unset in production', () => {
    const options = corsOptionsFromConfig(configWith({ NODE_ENV: 'production' }));
    expect(options.origin).toBe(false);
  });

  it('treats a blank value as unset', () => {
    const options = corsOptionsFromConfig(
      configWith({ CORS_ALLOWED_ORIGINS: ' , ', NODE_ENV: 'production' }),
    );
    expect(options.origin).toBe(false);
  });

  it('explicitly allows the Authorization header for the panel', () => {
    const options = corsOptionsFromConfig(configWith({ NODE_ENV: 'local' }));
    expect(options.allowedHeaders).toContain('Authorization');
    expect(options.credentials).toBe(true);
  });
});
