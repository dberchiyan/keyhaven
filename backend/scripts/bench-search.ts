import { z } from 'zod';

/**
 * Search latency on the running backend (README → "Search stays fast on the full seed"):
 * signs in as the demo tenant, then fires each query N times and reports p50 / p95 / max of the
 * end-to-end response time (HTTP, JSON, auth and rate-limit guards included).
 *
 *   npm run bench:search            # against http://localhost:3000, 30 requests per query
 */
const env = z
    .object({
        BENCH_BASE_URL: z.url().default('http://localhost:3000'),
        BENCH_EMAIL: z.string().default('maya.lopez@keyhaven.example'),
        BENCH_PASSWORD: z.string().default('Keyhaven-Demo-2026!'),
        /** 7 queries × 30 stay under the per-session ceiling of 300 requests a minute. */
        BENCH_RUNS: z.coerce.number().int().min(5).max(40).default(30),
    })
    .parse(process.env);

const QUERIES: Record<string, string> = {
    'newest, no filters': '',
    'city + rent range': 'city=austin&priceMin=1500&priceMax=2500',
    'city + beds + baths + amenities': 'city=seattle&beds=2&baths=1.5&pets=true&parking=true',
    'available by date, rent high to low': 'availableBy=2026-12-31&sort=price,desc',
    'homes for sale, houses, price low to high': 'kind=SALE&type=HOUSE&sort=price,asc',
    'text search, one typo': 'q=Walingford',
    'text search, two terms + filters': 'q=apartmnt+austin&pets=true&beds=1',
    'page 40 of newest': 'page=40',
};

const percentile = (sorted: number[], p: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

const cookie = async (): Promise<string> => {
    const response = await fetch(`${env.BENCH_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: env.BENCH_EMAIL, password: env.BENCH_PASSWORD }),
    });
    if (!response.ok) {
        throw new Error(`Sign-in failed: ${response.status}`);
    }
    return response.headers
        .getSetCookie()
        .map((line) => line.split(';')[0])
        .join('; ');
};

const run = async (): Promise<void> => {
    const session = await cookie();
    const lines = ['| Query | Results | p50 | p95 | max |', '|---|---|---|---|---|'];
    for (const [label, query] of Object.entries(QUERIES)) {
        const times: number[] = [];
        let total = 0;
        for (let i = 0; i < env.BENCH_RUNS; i += 1) {
            const started = performance.now();
            const response = await fetch(`${env.BENCH_BASE_URL}/api/v1/listings?size=12&${query}`, {
                headers: { Cookie: session },
            });
            const body = (await response.json()) as { totalElements?: number };
            times.push(performance.now() - started);
            if (!response.ok) {
                throw new Error(`${label}: ${response.status}`);
            }
            total = body.totalElements ?? 0;
        }
        const sorted = [...times].sort((a, b) => a - b);
        lines.push(
            `| ${label} | ${total} | ${percentile(sorted, 50).toFixed(1)} ms | ${percentile(sorted, 95).toFixed(1)} ms | ${(sorted.at(-1) ?? 0).toFixed(1)} ms |`,
        );
    }
    process.stdout.write(`${env.BENCH_RUNS} requests per query against ${env.BENCH_BASE_URL}\n\n${lines.join('\n')}\n`);
};

void run();
