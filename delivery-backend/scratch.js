const { S3Client } = require('@aws-sdk/client-s3');
try {
  new S3Client({
    region: '',
    credentials: { accessKeyId: '', secretAccessKey: '' }
  });
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR:", e.message);
}
