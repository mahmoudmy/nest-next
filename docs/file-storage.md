# Private S3-compatible storage

MinIO is the local S3-compatible service; AWS S3 or a compatible provider can be configured in production. Buckets must remain private. Object keys are server-generated organization/site/UUID paths, never accepted from the client. URLs are bearer capabilities and must not be logged or persisted as business metadata.

## Upload protocol

1. Browser computes base64 SHA-256 and POSTs `/api/files/upload-url` with filename, contentType, size, checksum and a registered target.
2. Guards authenticate and authorize file:upload. The adapter validates target existence/scope/access. Strict metadata validation limits size to 100 MiB and disallows unsafe filenames and unsupported types.
3. API creates a PENDING FileObject and returns `{id,url,method,headers,expiresIn}`. The signed PUT is valid for 120 seconds. Send the returned headers unchanged with the exact bytes. The browser calculates Content-Length automatically; do not manually set that forbidden browser header.
4. S3 validates the signed checksum and conditional `If-None-Match: *`. Reusing the URL cannot overwrite an existing object.
5. Browser POSTs `/api/files/:id/finalize`. The API HEADs the stored object and verifies size, content type and checksum. Matching data becomes AVAILABLE and generates FILE_UPLOADED; mismatches become REJECTED. Missing objects are not marked uploaded.

Large bytes go directly to storage, never through NestJS. FileObject is a generic polymorphic attachment abstraction, not a document-management entity. Content type is metadata, not proof that file content is safe. Add a real malware-scanning/quarantine service before allowing risky uploads into business workflows; do not claim the current checksum validation performs malware scanning.

## Download protocol

GET `/api/files/:id/download` requires an authenticated user, file:download, tenant-scoped lookup, valid resource adapter access and AVAILABLE state. It returns a signed URL valid for 60 seconds. Downloads force attachment disposition and application/octet-stream to avoid inline execution. FILE_DOWNLOADED records issuance of the authorized capability, not proof that a client finished transferring bytes; enable object-store access logs when actual transfer evidence is required.

## Storage configuration

`S3_ENDPOINT` selects an S3-compatible endpoint and path-style addressing. For AWS, omit it and use the regional service. `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are server-only environment values. API hosts and browsers must both reach the URL hostname used when signing; signing a Docker-internal hostname will not work in a browser. Local API runs on the host, so localhost:9000 works for both.

For production use bucket encryption, public-access blocking, narrowly scoped credentials, retention/lifecycle policies and backups. Apply `docker/s3-cors.json` with the real application origin. Allow PUT/GET/HEAD and Content-Type, x-amz-checksum-sha256, If-None-Match headers. Permit checksum HEAD retrieval. Configure cleanup for abandoned PENDING/REJECTED objects and expired sessions as an operational job; no fake background worker is provided.
