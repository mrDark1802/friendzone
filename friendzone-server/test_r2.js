import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://0bfb1e2b55a21851024948866d0d0563.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'dummy_access_key',
    secretAccessKey: 'dummy_secret_key',
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

async function testSigning() {
  console.log('--- TEST 1: PutObjectCommand WITH ContentType ---');
  const cmdWithContentType = new PutObjectCommand({
    Bucket: 'friendzone',
    Key: 'messages/images/user1/test.jpg',
    ContentType: 'image/jpeg',
  });
  const url1 = await getSignedUrl(client, cmdWithContentType, { expiresIn: 900 });
  const parsed1 = new URL(url1);
  console.log('SignedHeaders:', parsed1.searchParams.get('X-Amz-SignedHeaders'));
  console.log('Full URL:', url1);

  console.log('\n--- TEST 2: PutObjectCommand WITHOUT ContentType ---');
  const cmdWithoutContentType = new PutObjectCommand({
    Bucket: 'friendzone',
    Key: 'messages/images/user1/test.jpg',
  });
  const url2 = await getSignedUrl(client, cmdWithoutContentType, { expiresIn: 900 });
  const parsed2 = new URL(url2);
  console.log('SignedHeaders:', parsed2.searchParams.get('X-Amz-SignedHeaders'));
  console.log('Full URL:', url2);
}

testSigning();
