// Hand-rolled inline SVGs — this codebase has no icon library dependency
// anywhere (see config/admin-nav-icons.tsx), so new icons follow the same
// stroke-based convention instead of introducing one just for these four.

// Filled (not stroke-outlined like the others) — the classic "f" glyph
// reads as a recognizable mark only when solid; as a thin traced outline it
// just looked like an odd squiggle.
export const facebookIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
  >
    <path d="M13.5 21v-7.5H16l.4-3H13.5V8.5c0-.87.24-1.46 1.5-1.46H16.5V4.36C16.2 4.32 15.2 4.24 14 4.24c-2.4 0-4 1.46-4 4.15V10.5H7.5v3H10V21h3.5Z" />
  </svg>
);

export const instagramIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const youtubeIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
  >
    <path d="M21.2 6.2s-.2-1.5-.8-2.1c-.8-.8-1.6-.8-2-.9C15.6 3 12 3 12 3h0s-3.6 0-6.4.2c-.4 0-1.3.1-2 .9-.6.6-.8 2.1-.8 2.1S2.6 8 2.6 9.7v1.4c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.2.9 1.6.2 6.7.2 6.7.2s3.6 0 6.4-.2c.4 0 1.3-.1 2-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5V9.7c0-1.7-.2-3.5-.2-3.5Z" />
    <path d="M10 9.5v5l4.3-2.5Z" fill="currentColor" stroke="none" />
  </svg>
);

// Filled for the same reason as facebookIcon above — the note-and-wave
// shape needs a solid fill to read clearly at icon size.
export const tiktokIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="size-5"
  >
    <path d="M16.6 2c.4 2.3 1.9 3.9 4.4 4.1v3.1c-1.6 0-3.1-.5-4.4-1.5v6.8c0 3.6-2.9 6.5-6.5 6.5S3.6 18.1 3.6 14.5 6.5 8 10.1 8c.3 0 .6 0 .9.1v3.2a3.4 3.4 0 0 0-.9-.1 3.3 3.3 0 1 0 3.3 3.3V2h3.2Z" />
  </svg>
);
