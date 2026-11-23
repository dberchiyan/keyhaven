import { readFile } from 'node:fs/promises';

const PAIRS = [
    ['node_modules/.tmp/api.ts', 'src/shared/types/api.ts'],
    ['node_modules/.tmp/schemas.generated.ts', 'src/shared/api/schemas.generated.ts'],
] as const;

const root = new URL('../', import.meta.url);
const stale: string[] = [];
for (const [fresh, committed] of PAIRS) {
    const [expected, actual] = await Promise.all([
        readFile(new URL(fresh, root), 'utf8'),
        readFile(new URL(committed, root), 'utf8'),
    ]);
    if (expected !== actual) {
        stale.push(committed);
    }
}
if (stale.length > 0) {
    process.stderr.write(
        `Out of date with backend/openapi.json: ${stale.join(', ')} — run \`npm run generate:api\`.\n`,
    );
    process.exit(1);
}
process.stdout.write('api: generated types and schemas match backend/openapi.json\n');
