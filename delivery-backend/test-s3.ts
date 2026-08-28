import { S3Client } from '@aws-sdk/client-s3';

try {
  const s3Client = new S3Client({
    region: '',
    credentials: {
      accessKeyId: '',
      secretAccessKey: '',
    },
  });
  console.log('SUCCESS');
} catch (error) {
  console.error('FAILED TO INIT S3CLIENT:', error);
}
