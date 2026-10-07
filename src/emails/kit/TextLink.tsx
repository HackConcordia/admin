/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { ReactNode } from "react";
import { Link } from "react-email";
import { colors } from "./theme";
import { emailUrl } from "./url";

/**
 * An inline link inside a paragraph (e.g. the Discord invite, the venue's map link).
 * Like Button, it checks `href`: anything but absolute https (or http://localhost)
 * throws, so a misconfigured URL (say `discord.gg/abc`) is never sent as a broken link.
 * Templates link data URLs only through Button or TextLink, never react-email's Link.
 */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={emailUrl(href)} target="_blank" style={{ color: colors.ink, textDecoration: "underline" }}>
      {children}
    </Link>
  );
}
