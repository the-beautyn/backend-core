import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_TRANSFORM = 'skipResponseTransform';

/**
 * Opt a handler (or whole controller) out of TransformInterceptor's
 * `{ success, data }` envelope. Use this for endpoints whose body has a
 * fixed external schema — e.g. Apple App Site Association JSON, raw HTML
 * fallback pages, webhook acknowledgements, or anything a third party
 * parses directly.
 */
export const SkipResponseTransform = () => SetMetadata(SKIP_RESPONSE_TRANSFORM, true);
