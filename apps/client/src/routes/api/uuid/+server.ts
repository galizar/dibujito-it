import type { RequestHandler } from './$types';

import { v4 as uuid } from 'uuid';

export const GET: RequestHandler = async () => {
	return new Response(uuid());
};
