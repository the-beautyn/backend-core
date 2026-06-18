import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { OptionalJwtAuthGuard } from '../../src/shared/guards/optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let getUser: jest.Mock;

  const makeContext = (authorization?: string) => {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: authorization ? { authorization } : {},
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    getUser = jest.fn();
    const supabase = { auth: { getUser } } as unknown as SupabaseClient;
    guard = new OptionalJwtAuthGuard(supabase);
  });

  it('allows anonymous access when no Authorization header is present', async () => {
    const { context, request } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('allows anonymous access when the header is not a Bearer token', async () => {
    const { context, request } = makeContext('Basic abc123');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('populates request.user for a valid token', async () => {
    const user = { id: 'user-1', user_metadata: { user_role: 'client' } };
    getUser.mockResolvedValue({ data: { user }, error: null });
    const { context, request } = makeContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getUser).toHaveBeenCalledWith('valid-token');
    expect(request.user).toMatchObject({ id: 'user-1', role: 'client' });
  });

  it('throws 401 when a token is supplied but Supabase returns an error (expired/invalid)', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'token is expired' } });
    const { context } = makeContext('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 when a token is supplied but no user is returned', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { context } = makeContext('Bearer ghost-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 when token validation throws (e.g. network failure)', async () => {
    getUser.mockRejectedValue(new Error('network down'));
    const { context } = makeContext('Bearer some-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
