import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch('api/drawings');

	return {
		drawings: res.json(),
	}
};