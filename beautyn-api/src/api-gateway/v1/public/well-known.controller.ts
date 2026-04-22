import { Controller, Get, Header } from '@nestjs/common';

@Controller('.well-known')
export class WellKnownController {
  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
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
