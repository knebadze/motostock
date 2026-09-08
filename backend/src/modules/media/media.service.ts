import fs from "node:fs";
import path from "node:path";
import { UPLOAD_ROOT } from "../../lib/storage.js";
import { logger } from "../../lib/logger.js";
import { isCloudStorageEnabled } from "../settings/settings.service.js";
import { termsRepository } from "../terms/terms.repository.js";
import { newsletterCampaignsRepository } from "../newsletter-campaigns/newsletter-campaigns.repository.js";

const RICH_TEXT_SUBFOLDER = "rich-text";

// uploadRichTextImage (media.controller.ts) has no entity to attach cleanup
// to — unlike every other saveUploadedImage call site (products, categories,
// banks, ...), which always has a specific row whose old image
// deleteUploadedImage removes on replace, a rich-text image pasted into a
// Terms/NewsletterCampaign draft has no owning row at upload time (the
// RichTextEditor may be composing a brand-new draft) and nothing ever
// revisits it later even once it IS embedded — every image ever pasted into
// either editor, including ones later removed from the text or abandoned in
// a discarded draft, stays in uploads/rich-text forever.
//
// Cloud-storage mode is intentionally skipped for now — deleting the wrong
// Cloudinary asset is a live, DB-agnostic delete (unlike a local file, it's
// gone from a real hosted account), and doing that safely needs the
// Cloudinary Admin API's own resource-listing endpoint (with its own
// pagination and rate limits), which isn't wired up anywhere in this
// codebase yet. Local-disk mode only, for now — see storage.ts's own
// dispatch-by-URL-shape reasoning for why "which mode" has to be read per
// file rather than assumed from today's setting; here it's simpler because
// every disk file this function considers is, by definition, sitting on
// local disk already.
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export async function pruneOrphanedRichTextImages(): Promise<number> {
  if (await isCloudStorageEnabled()) return 0;

  const dir = path.join(UPLOAD_ROOT, RICH_TEXT_SUBFOLDER);
  if (!fs.existsSync(dir)) return 0;

  const [terms, campaigns] = await Promise.all([
    termsRepository.findFirst(),
    newsletterCampaignsRepository.findMany(),
  ]);

  // One haystack of every place a rich-text image URL could still be
  // referenced from. A plain substring check per file (below) rather than
  // parsing/regexing `<img src>` tags out of the HTML — far less
  // false-negative risk (a parsing miss would misclassify a still-used
  // image as orphaned and delete it) than reference EXTRACTION would carry;
  // checking "is this exact relative path present anywhere in the text" is
  // the safer direction to err in for a delete operation.
  const haystack = [
    terms?.contentKa ?? "",
    terms?.contentEn ?? "",
    terms?.contentRu ?? "",
    ...campaigns.map((campaign) => campaign.body),
  ].join("\n");

  const now = Date.now();
  let deleted = 0;
  for (const filename of fs.readdirSync(dir)) {
    const relativePath = `/uploads/${RICH_TEXT_SUBFOLDER}/${filename}`;
    if (haystack.includes(relativePath)) continue;

    const filePath = path.join(dir, filename);
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }
    // Grace period — an image just pasted into an in-progress, not-yet-saved
    // draft is legitimately unreferenced by any persisted row for as long
    // as the admin is still composing; only sweeping files older than this
    // avoids racing a real editing session.
    if (now - stats.mtimeMs < GRACE_PERIOD_MS) continue;

    try {
      fs.rmSync(filePath, { force: true });
      deleted++;
    } catch (err) {
      logger.error({ err, filePath }, "Failed to delete an orphaned rich-text image");
    }
  }

  return deleted;
}
