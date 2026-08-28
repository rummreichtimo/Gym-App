import { NotFoundError, ok, withUser } from '@/server/api';
import { getAdminOverview, isAdminEmail } from '@/server/admin';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user) => {
  // Anyone but the configured administrator is told the route does not exist,
  // so its presence is not observable from a normal account.
  if (!isAdminEmail(user.email)) throw new NotFoundError('Nicht gefunden');

  return ok(await getAdminOverview());
});
