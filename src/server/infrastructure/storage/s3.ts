import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  type ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildObjectKey,
  buildPublicUrl,
  type PresignedUpload,
  type PresignUploadParams,
  type StoragePort,
} from "@/server/domain/storage";

// Presigned PUTs are short-lived: the browser uploads immediately after asking.
const PRESIGN_TTL_SECONDS = 60;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Config + client are read lazily and memoized: the composition root imports this
// adapter eagerly, but public read pages must not crash when S3 env is absent —
// only presign/delete calls (admin write path) actually need credentials.
type S3Config = {
  client: S3Client;
  bucket: string;
  publicHost: string;
  acl: ObjectCannedACL | null;
};

let cachedConfig: S3Config | null = null;

function getConfig(): S3Config {
  if (cachedConfig) return cachedConfig;

  const region = requireEnv("AWS_REGION");
  const bucket = requireEnv("AWS_BUCKET_NAME");
  const accessKeyId = requireEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("AWS_SECRET_ACCESS_KEY");
  const publicHost = requireEnv("S3_PUBLIC_HOST");

  // Default: rely on the bucket policy / CloudFront for public read and presign a
  // PLAIN PUT (gotcha #2). Only sign `x-amz-acl` when the bucket still enforces
  // object ACLs — opt in via S3_UPLOAD_ACL=public-read.
  const aclEnv = process.env.S3_UPLOAD_ACL?.trim();
  const acl = aclEnv ? (aclEnv as ObjectCannedACL) : null;

  cachedConfig = {
    client: new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      // AWS SDK v3 adds a default CRC32 checksum to PutObject. On a PRESIGNED PUT
      // there is no body at signing time, so it bakes in the checksum of an EMPTY
      // payload (x-amz-checksum-crc32=AAAAAA==) into the signed URL — S3 then
      // rejects the real file body as a mismatch. Only compute checksums when the
      // operation actually requires one so presigned PUTs stay clean.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
    bucket,
    publicHost,
    acl,
  };
  return cachedConfig;
}

export function createS3Storage(): StoragePort {
  return {
    async presignUpload({
      filename,
      contentType,
      prefix,
    }: PresignUploadParams): Promise<PresignedUpload> {
      const { client, bucket, publicHost, acl } = getConfig();
      const key = buildObjectKey(prefix, filename, new Date());

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ...(acl ? { ACL: acl } : {}),
      });

      // Sign exactly the headers the browser will echo — Content-Type always,
      // x-amz-acl only when we set an ACL (v3 rejects a mismatch with 403).
      const signableHeaders = new Set(["content-type"]);
      if (acl) signableHeaders.add("x-amz-acl");

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: PRESIGN_TTL_SECONDS,
        signableHeaders,
      });

      const requiredHeaders: Record<string, string> = {
        "Content-Type": contentType,
      };
      if (acl) requiredHeaders["x-amz-acl"] = acl;

      return {
        uploadUrl,
        key,
        publicUrl: buildPublicUrl(publicHost, key),
        requiredHeaders,
      };
    },

    async deleteObject(key: string): Promise<void> {
      const { client, bucket } = getConfig();
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
