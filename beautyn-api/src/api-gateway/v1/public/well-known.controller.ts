import { Controller, Get, Header } from '@nestjs/common';
import { SkipResponseTransform } from '../../../shared/decorators/skip-response-transform.decorator';

@Controller('.well-known')
export class WellKnownController {
  // Apple fetches this JSON and expects the top-level `applinks` key. Skip
  // the global { success, data } envelope or Universal Links association
  // fails in production.
  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
  @SkipResponseTransform()
  appleAppSiteAssociation() {
    return {
      applinks: {
        details: [
          {
            appIDs: [
              '452NG5983H.com.beautyn.app',
              '452NG5983H.com.beautyn.app.stage',
              '452NG5983H.com.beautyn.app.dev',
            ],
            components: [
              {
                '/': '/auth/reset',
                '?': { code: '?*' },
                comment: 'Password reset',
              },
            ],
          },
        ],
      },
    };
  }
}
