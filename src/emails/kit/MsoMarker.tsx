/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import { MSO_MARKERS } from "./mso";

/** An empty <span> that render.ts replaces with an Outlook conditional comment (see mso.ts). */
export function MsoMarker({ at }: { at: keyof typeof MSO_MARKERS }) {
  const value = at === "containerOpen" ? "container-open" : "container-close";
  return <span data-mso-marker={value} />;
}
