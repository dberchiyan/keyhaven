import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Empties the public demo (DEMO_MODE=true only): drops the `public` schema with every table, row
 * and trigger, creates it empty, and removes every object from the photo bucket — the seed's
 * photos are external URLs, so whatever is in the bucket was uploaded by visitors. `npm run
 * db:demo-reset` follows with the migrations and the seed. A schema drop, not TRUNCATE:
 * `audit_events` refuses TRUNCATE by design.
 */
const resetEnv = z.object({
    DEMO_MODE: z.literal('true'),
    DATABASE_URL: z.url(),
    R2_ENDPOINT: z.url(),
    R2_INTERNAL_ENDPOINT: z.string().optional(),
    R2_REGION: z.string().min(1),
    R2_BUCKET: z.string().min(3),
    R2_ACCESS_KEY: z.string().min(1),
    R2_SECRET_KEY: z.string().min(1),
});

const log = (line: string): void => {
    process.stdout.write(`${line}\n`);
};

const emptyBucket = async (env: z.infer<typeof resetEnv>): Promise<number> => {
    const client = new S3Client({
        endpoint: env.R2_INTERNAL_ENDPOINT || env.R2_ENDPOINT,
        region: env.R2_REGION,
        credentials: { accessKeyId: env.R2_ACCESS_KEY, secretAccessKey: env.R2_SECRET_KEY },
        forcePathStyle: true,
    });
    let removed = 0;
    let token: string | undefined;
    do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: env.R2_BUCKET, ContinuationToken: token }));
        const keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [{ Key: object.Key }] : []));
        if (keys.length > 0) {
            await client.send(
                new DeleteObjectsCommand({ Bucket: env.R2_BUCKET, Delete: { Objects: keys, Quiet: true } }),
            );
            removed += keys.length;
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return removed;
};

const reset = async (): Promise<void> => {
    try {
        process.loadEnvFile('.env');
    } catch {
        // Variables come from the environment.
    }
    const env = resetEnv.parse(process.env);
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
    try {
        await prisma.$transaction([
            prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE'),
            prisma.$executeRawUnsafe('CREATE SCHEMA public'),
        ]);
        log('Demo database emptied');
    } finally {
        await prisma.$disconnect();
    }
    log(`Photo bucket emptied: ${String(await emptyBucket(env))} objects removed`);
};

void reset();
