import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { z } from 'zod';

/**
 * One-time storage provisioning (`make setup`, the compose `storage-init` service): the photo
 * bucket with public reads and the CORS rule the browser's direct uploads need. Idempotent.
 * Cloudflare R2 refuses bucket policies through the API — there, public access and CORS are set
 * in the dashboard and this script only checks that the bucket exists.
 */
const env = z
  .object({
    R2_ENDPOINT: z.url(),
    R2_INTERNAL_ENDPOINT: z.string().optional(),
    R2_REGION: z.string().min(1),
    R2_BUCKET: z.string().min(3),
    R2_ACCESS_KEY: z.string().min(1),
    R2_SECRET_KEY: z.string().min(1),
    APP_URL: z.url(),
  })
  .parse(
    (() => {
      try {
        process.loadEnvFile('.env');
      } catch {
        // Variables come from the environment (compose).
      }
      return process.env;
    })(),
  );

const client = new S3Client({
  endpoint: env.R2_INTERNAL_ENDPOINT || env.R2_ENDPOINT,
  region: env.R2_REGION,
  credentials: { accessKeyId: env.R2_ACCESS_KEY, secretAccessKey: env.R2_SECRET_KEY },
  forcePathStyle: true,
});

const log = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

const init = async (): Promise<void> => {
  const bucket = env.R2_BUCKET;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    log(`Bucket ${bucket} exists`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    log(`Bucket ${bucket} created`);
  }
  try {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      }),
    );
    log('Public reads allowed');
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [env.APP_URL],
              AllowedMethods: ['PUT', 'GET'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      }),
    );
    log(`CORS allows uploads from ${env.APP_URL}`);
  } catch (error: unknown) {
    // R2: policies and CORS are set in the Cloudflare dashboard, not through the API.
    log(
      `Bucket policy / CORS not set through the API (${String(error)}) — set them in the provider's console`,
    );
  }
};

void init();
