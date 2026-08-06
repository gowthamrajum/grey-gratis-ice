// -------------------------------
// Media storage on Cloudflare R2
// -------------------------------
// Service media — a welcome clip, a photo for the announcements — has to live
// somewhere both a phone and the projection machine can reach. This relay is
// not that place: its disk is wiped on every restart, and free instances
// restart often, so a file uploaded on Saturday would frequently not be there
// on Sunday.
//
// R2 is: 10 GB and no egress charge on the free plan, which is more than this
// will ever need. The browser uploads DIRECTLY to it with a presigned URL, so
// the file never passes through here — which sidesteps the 50 mb body limit and
// means a 300 mb video costs this instance nothing but the signature.
//
// Signed by hand rather than with an SDK. Presigning is one well-specified
// function, the AWS SDK is several megabytes of dependency for it, and the
// implementation below is checked against AWS's own published test vector (see
// r2.test.js) — which is better evidence than an untested dependency.
//
// Entirely dormant until the four variables below are set. Everything answers
// "not configured" and the app hides the upload option rather than offering
// something that cannot work.
//
//   R2_ACCOUNT_ID           Cloudflare account id
//   R2_ACCESS_KEY_ID        R2 API token, Object Read & Write
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET               bucket name
//   R2_PUBLIC_BASE          where objects are readable, e.g. https://pub-xxx.r2.dev
//
// The bucket also needs CORS allowing PUT from the app's origin — the browser
// talks to R2 directly, so R2 is what has to permit it. See README.
const crypto = require("crypto");

const ALGORITHM = "AWS4-HMAC-SHA256";
// R2 has no regions; it wants the literal "auto" in the credential scope.
const REGION = "auto";
const SERVICE = "s3";

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.R2_BUCKET || "";
  const publicBase = (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const ok = !!(accountId && accessKeyId && secretAccessKey && bucket && publicBase);
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase, ok };
}

const hmac = (key, data) => crypto.createHmac("sha256", key).update(data, "utf8").digest();
const sha256Hex = (data) => crypto.createHash("sha256").update(data, "utf8").digest("hex");

// Every path segment is escaped, and the slashes between them are not — S3
// canonicalises the URI, not the string.
function encodePath(path) {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()))
    .join("/");
}

/** The query string in the order S3 requires: sorted by key, then by value. */
function canonicalQuery(params) {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
}

function signingKey(secret, dateStamp) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, dateStamp), REGION), SERVICE), "aws4_request");
}

/**
 * A presigned URL for one request.
 *
 * Exported with every input explicit — host, path, the clock — so it can be
 * driven straight from AWS's published example and shown to produce their
 * published signature. `now` is a parameter for exactly that reason.
 */
function presign({ method, host, path, accessKeyId, secretAccessKey, expiresIn, now, extraQuery, payloadHash }) {
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const query = Object.assign(
    {
      "X-Amz-Algorithm": ALGORITHM,
      "X-Amz-Credential": `${accessKeyId}/${scope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "host"
    },
    extraQuery || {}
  );

  const canonicalRequest = [
    method,
    encodePath(path),
    canonicalQuery(query),
    `host:${host}\n`,
    "host",
    payloadHash || "UNSIGNED-PAYLOAD"
  ].join("\n");

  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = crypto
    .createHmac("sha256", signingKey(secretAccessKey, dateStamp))
    .update(stringToSign, "utf8")
    .digest("hex");

  return `https://${host}${encodePath(path)}?${canonicalQuery(query)}&X-Amz-Signature=${signature}`;
}

/** Only what can plausibly go on a screen, and nothing that could be served
 *  back as script. */
const ALLOWED = /^(image\/(jpeg|png|gif|webp|avif)|video\/(mp4|webm|quicktime|x-m4v)|audio\/(mpeg|mp4|aac|wav|ogg))$/i;

/** 300 MB. Well past any welcome clip, well short of anything that belongs on
 *  a church's free plan. */
const MAX_BYTES = 300 * 1024 * 1024;

/**
 * A key that cannot escape its prefix or collide.
 *
 * The operator's filename is kept — recognisably, so a bucket listing means
 * something a year later — but only its safe characters, and behind a random
 * prefix so two people uploading welcome.mp4 do not overwrite each other.
 */
function mediaKey(name) {
  const clean =
    String(name || "file")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      // Runs of dots collapse to one. An S3 key is not a filesystem path, so
      // ".." cannot traverse here — but this name is what a browser saves the
      // file as when someone downloads it, and it should not be able to mean
      // anything but a name there either.
      .replace(/\.{2,}/g, ".")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(-80) || "file";
  const stamp = new Date().toISOString().slice(0, 10);
  return `service-media/${stamp}/${crypto.randomBytes(6).toString("hex")}-${clean}`;
}

/** Where to PUT one file, and where it will be readable afterwards. */
function presignUpload(name, contentType, size) {
  const cfg = r2Config();
  if (!cfg.ok) return { error: "not-configured" };
  if (!ALLOWED.test(String(contentType || ""))) return { error: "type-not-allowed" };
  if (!Number.isFinite(size) || size <= 0) return { error: "bad-size" };
  if (size > MAX_BYTES) return { error: "too-large" };

  const key = mediaKey(name);
  const url = presign({
    method: "PUT",
    host: `${cfg.accountId}.r2.cloudflarestorage.com`,
    path: `/${cfg.bucket}/${key}`,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    // Long enough for a large file on a church's uplink, short enough that a
    // leaked link is not a standing write credential.
    expiresIn: 60 * 30,
    now: new Date()
  });
  return { key, uploadUrl: url, publicUrl: `${cfg.publicBase}/${key}`, maxBytes: MAX_BYTES };
}

module.exports = { r2Config, presign, presignUpload, mediaKey, ALLOWED, MAX_BYTES };
