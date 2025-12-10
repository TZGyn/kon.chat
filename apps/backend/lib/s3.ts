export const s3Client = new Bun.S3Client({
	accessKeyId: Bun.env.S3_ACCESS_KEY_ID,
	secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY,
	bucket: Bun.env.S3_BUCKET,
	endpoint: Bun.env.S3_API_URL,
})
