// saveUploadedImage() (see storage.ts) returns a relative /uploads/... path
// on disk storage but an already-absolute https://res.cloudinary.com/...
// URL on cloud storage — this normalizes either into something a browser or
// email client can load regardless of which storage backend is active.
export function toAbsoluteUrl(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}
