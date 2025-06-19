import {
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
	S3_BUCKET,
	S3_API_URL,
} from '$env/static/private'

export const s3Client = new Bun.S3Client({
	accessKeyId: S3_ACCESS_KEY_ID,
	secretAccessKey: S3_SECRET_ACCESS_KEY,
	bucket: S3_BUCKET,
	endpoint: S3_API_URL,
})
