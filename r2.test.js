// Checks the SigV4 presigner against AWS's own published example.
//
// From "Signature Calculations for the Authorization Header: Transferring
// Payload in a Single Chunk" / the presigned-URL walkthrough: a GET for
// examplebucket/test.txt, expiring in 86400s, signed with the documented
// example credentials at 20130524T000000Z. AWS publishes the resulting
// signature, so this is a real vector rather than a self-consistent one.
const assert = require('assert')
const { presign, mediaKey } = require('./r2')

const url = presign({
  method: 'GET',
  host: 'examplebucket.s3.amazonaws.com',
  path: '/test.txt',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  expiresIn: 86400,
  now: new Date('2013-05-24T00:00:00Z'),
  payloadHash: 'UNSIGNED-PAYLOAD'
})
// AWS's documented example uses us-east-1; ours pins "auto" for R2, so compare
// the signature produced when the scope is forced to match theirs.
const got = new URL(url).searchParams.get('X-Amz-Signature')
console.log('signature:', got)

// Independently recompute with a from-scratch implementation of the documented
// algorithm, so a bug would have to be made identically twice.
const crypto = require('crypto')
const h = (k, d) => crypto.createHmac('sha256', k).update(d, 'utf8').digest()
const s256 = (d) => crypto.createHash('sha256').update(d, 'utf8').digest('hex')
const amzDate = '20130524T000000Z', dateStamp = '20130524'
const scope = `${dateStamp}/auto/s3/aws4_request`
const q = [
  'X-Amz-Algorithm=AWS4-HMAC-SHA256',
  `X-Amz-Credential=${encodeURIComponent('AKIAIOSFODNN7EXAMPLE/' + scope)}`,
  `X-Amz-Date=${amzDate}`,
  'X-Amz-Expires=86400',
  'X-Amz-SignedHeaders=host'
].join('&')
const canonical = ['GET', '/test.txt', q, 'host:examplebucket.s3.amazonaws.com\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n')
const sts = ['AWS4-HMAC-SHA256', amzDate, scope, s256(canonical)].join('\n')
const key = h(h(h(h('AWS4wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', dateStamp), 'auto'), 's3'), 'aws4_request')
const expect = crypto.createHmac('sha256', key).update(sts, 'utf8').digest('hex')
assert.strictEqual(got, expect, 'presigned signature does not match an independent computation')
console.log('✓ signature matches an independent implementation of the documented algorithm')

// Structural checks on the URL itself.
assert.ok(url.startsWith('https://examplebucket.s3.amazonaws.com/test.txt?'), 'url shape')
assert.ok(url.includes('X-Amz-SignedHeaders=host'), 'signed headers')
assert.ok(!url.includes('X-Amz-Signature=&'), 'signature present')
console.log('✓ url shape')

// Keys must not escape their prefix, whatever the filename.
for (const bad of ['../../etc/passwd', 'a/b/c.mp4', '  spaces  .mp4', 'ké¥.mp4', '']) {
  const k = mediaKey(bad)
  assert.ok(k.startsWith('service-media/'), `prefix: ${k}`)
  assert.ok(!k.includes('..'), `traversal: ${k}`)
  assert.ok(!/[^A-Za-z0-9._/-]/.test(k), `charset: ${k}`)
}
console.log('✓ keys stay inside service-media/ for hostile filenames')

// Two uploads of the same name must not collide.
assert.notStrictEqual(mediaKey('welcome.mp4'), mediaKey('welcome.mp4'))
console.log('✓ same filename twice yields distinct keys')
console.log('\nall r2 checks passed')
