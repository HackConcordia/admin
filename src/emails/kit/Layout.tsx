/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { ReactNode } from "react";
import { Body, Container, Head, Html, Img, Preview } from "react-email";
import { ASSETS, EVENT } from "./brand";
import { Footer } from "./Footer";
import { MsoMarker } from "./MsoMarker";
import { CLASS, RESPONSIVE_CSS } from "./responsive";
import { colors, fonts, msoExact, sizes, text } from "./theme";
import type { CopyLanguage, EmailLanguage } from "../types";

const FRAME = `${sizes.frameWidth}px solid ${colors.black}`;

function Header() {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ backgroundColor: colors.black }}
    >
      <tbody>
        <tr>
          <td className={CLASS.band} style={{ padding: `20px ${sizes.bandPaddingX}px` }}>
            {/* Two inline-block cells: side by side on desktop, the date drops under the wordmark on phones. */}
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
              <tbody>
                <tr>
                  <td valign="middle" style={{ display: "inline-block", verticalAlign: "middle", padding: "4px 0" }}>
                    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
                      <tbody>
                        <tr>
                          <td valign="middle" style={{ width: `${sizes.logoWidth}px`, paddingRight: "12px" }}>
                            {/* Decorative: the live wordmark next to it already names the event. */}
                            <Img
                              src={ASSETS.logo}
                              width={sizes.logoWidth}
                              height={sizes.logoWidth}
                              alt=""
                              style={{ display: "block", border: 0 }}
                            />
                          </td>
                          <td
                            valign="middle"
                            style={{
                              color: colors.accent,
                              fontFamily: fonts.body,
                              fontSize: "18px",
                              fontWeight: 700,
                              lineHeight: "24px",
                              letterSpacing: "0.12em",
                              whiteSpace: "nowrap",
                              ...msoExact,
                            }}
                          >
                            {EVENT.wordmark}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td
                    className={CLASS.headerDate}
                    align="right"
                    valign="middle"
                    style={{
                      display: "inline-block",
                      verticalAlign: "middle",
                      float: "right",
                      // 16 + 24 + 16 = 56px, the height of the logo cell: centred on desktop.
                      padding: "16px 0",
                      color: colors.bandText,
                      fontFamily: fonts.body,
                      fontSize: text.tinyFontSize,
                      fontWeight: 600,
                      lineHeight: "24px",
                      letterSpacing: "0.12em",
                      whiteSpace: "nowrap",
                      ...msoExact,
                    }}
                  >
                    {EVENT.headerDate}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td
            data-skip-in-text="true"
            style={{
              height: `${sizes.accentBarHeight}px`,
              lineHeight: `${sizes.accentBarHeight}px`,
              fontSize: 0,
              backgroundColor: colors.accent,
              ...msoExact,
            }}
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** The ticket-stub "perforation" between the body and the footer band. */
function Perforation() {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} data-skip-in-text="true">
      <tbody>
        <tr>
          <td
            style={{
              borderTop: `2px dashed ${colors.black}`,
              height: `${sizes.stubSpace}px`,
              lineHeight: `${sizes.stubSpace}px`,
              fontSize: 0,
              backgroundColor: colors.white,
              ...msoExact,
            }}
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** The <html lang>: one language, or French (first block) when bilingual. */
function documentLanguage(lang: EmailLanguage): CopyLanguage {
  return lang === "en" ? "en" : "fr";
}

/** Footer languages in the order they appear in the body. */
export function footerLanguages(lang: EmailLanguage): readonly CopyLanguage[] {
  return lang === "bilingual" ? ["fr", "en"] : [lang];
}

/**
 * Page shell: head, hidden preheader, then the "pass": a black-framed 600px card with
 * the header band, white body, perforation and footer band.
 * render.ts adds the Outlook-only parts (kit/mso.ts) at the markers and the font link.
 */
export function Layout({
  lang,
  title,
  preheader,
  children,
}: {
  lang: EmailLanguage;
  title: string;
  preheader: string;
  children: ReactNode;
}) {
  const htmlLang = documentLanguage(lang);
  return (
    <Html lang={htmlLang} dir="ltr">
      <Head>
        <title>{title}</title>
        {/* Without it, iOS Mail / Samsung / Android mail lay the email out at a desktop width and the
            phone media query (RESPONSIVE_CSS) never applies. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link href={fonts.googleFontsHref} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      </Head>
      <Body
        lang={htmlLang}
        dir="ltr"
        style={{
          margin: 0,
          padding: "24px 0",
          backgroundColor: colors.paper,
          fontFamily: fonts.body,
          color: colors.ink,
        }}
      >
        <Preview useTitleTag={false}>{preheader}</Preview>
        <MsoMarker at="containerOpen" />
        <Container
          data-email-container="true"
          style={{
            maxWidth: `${sizes.containerWidth}px`,
            width: "100%",
            // The frame stays inside the 100% width, so phones get no sideways scroll.
            boxSizing: "border-box",
            backgroundColor: colors.white,
            border: FRAME,
            borderCollapse: "separate",
          }}
        >
          <Header />
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
            <tbody>
              <tr>
                <td
                  className={CLASS.body}
                  style={{
                    padding: `${sizes.bodyPaddingY}px ${sizes.bodyPaddingX}px`,
                    backgroundColor: colors.white,
                    color: colors.ink,
                    fontFamily: fonts.body,
                    fontSize: text.fontSize,
                    lineHeight: text.lineHeight,
                    ...msoExact,
                  }}
                >
                  {children}
                </td>
              </tr>
            </tbody>
          </table>
          <Perforation />
          <Footer languages={footerLanguages(lang)} />
        </Container>
        <MsoMarker at="containerClose" />
      </Body>
    </Html>
  );
}
