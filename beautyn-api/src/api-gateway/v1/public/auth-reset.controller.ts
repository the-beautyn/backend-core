import { Controller, Get, Header } from '@nestjs/common';
import { SkipResponseTransform } from '../../../shared/decorators/skip-response-transform.decorator';

const RESET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beautyn</title>
</head>
<body>
<h1>Open the Beautyn app to finish resetting your password.</h1>
</body>
</html>
`;

@Controller('auth')
export class AuthResetController {
  // HTML fallback page — must ship raw, not as { success, data }.
  @Get('reset')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @SkipResponseTransform()
  resetFallback() {
    return RESET_HTML;
  }
}
