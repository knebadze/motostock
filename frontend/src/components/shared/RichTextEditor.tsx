"use client";

import dynamic from "next/dynamic";

// Tiptap (+ProseMirror) is a large bundle that only admin forms with a
// rich-text field need — loaded as its own chunk when one of those forms
// actually renders, instead of riding along in every importing page's JS.
// The implementation lives in RichTextEditorImpl.tsx; consumers keep
// importing from here.
export const RichTextEditor = dynamic(
  () => import("./RichTextEditorImpl").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/40" />,
  },
);
