import { SetMetadata } from '@nestjs/common';

export const ALLOW_CLIENTS_KEY = 'allowClients';

/**
 * Clients are blocked from every route by JwtAuthGuard unless the route (or its controller) has this.
 * The route itself must still limit a client to their own data.
 */
export const AllowClients = () => SetMetadata(ALLOW_CLIENTS_KEY, true);
