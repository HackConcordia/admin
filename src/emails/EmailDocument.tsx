/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import { LanguageDivider } from "./kit/LanguageDivider";
import { Layout } from "./kit/Layout";
import { LanguageSection } from "./kit/Section";
import { registryEntry } from "./registry";
import type { CopyLanguage, EmailData, EmailKey, EmailLanguage, LanguageCopy } from "./types";

const BILINGUAL_ORDER: readonly CopyLanguage[] = ["fr", "en"];

/** The language an email is actually sent in (account emails are always bilingual). */
export function effectiveLanguage(key: EmailKey, lang: EmailLanguage): EmailLanguage {
  if (registryEntry(key).alwaysBilingual) return "bilingual";
  return lang === "en" || lang === "fr" ? lang : "bilingual";
}

function blockLanguages(lang: EmailLanguage): readonly CopyLanguage[] {
  return lang === "bilingual" ? BILINGUAL_ORDER : [lang];
}

/** "<fr> // <en>" when bilingual. */
export function emailSubject<K extends EmailKey>(key: K, data: EmailData[K], lang: EmailLanguage): string {
  const { copy } = registryEntry(key);
  const effective = effectiveLanguage(key, lang);
  return blockLanguages(effective)
    .map((language) => copy[language].subject(data))
    .join(" // ");
}

/** Bilingual emails use the French preheader (French comes first). */
function emailPreheader<K extends EmailKey>(key: K, data: EmailData[K], lang: EmailLanguage): string {
  const { copy } = registryEntry(key);
  const first = blockLanguages(effectiveLanguage(key, lang))[0];
  return copy[first].preheader(data);
}

/** The full email for one key: layout + one language block, or French, divider, English. */
export function EmailDocument<K extends EmailKey>({
  emailKey,
  data,
  lang,
}: {
  emailKey: K;
  data: EmailData[K];
  lang: EmailLanguage;
}) {
  const { copy } = registryEntry(emailKey);
  const effective = effectiveLanguage(emailKey, lang);
  const languages = blockLanguages(effective);
  const bilingual = languages.length > 1;

  return (
    <Layout
      lang={effective}
      title={emailSubject(emailKey, data, effective)}
      preheader={emailPreheader(emailKey, data, effective)}
    >
      {languages.map((language, index) => {
        const languageCopy: LanguageCopy<EmailData[K]> = copy[language];
        const { Body } = languageCopy;
        return (
          <div key={language}>
            {index > 0 ? <LanguageDivider /> : null}
            <LanguageSection lang={language} label={languageCopy.label} showLanguageLabel={bilingual}>
              <Body data={data} />
            </LanguageSection>
          </div>
        );
      })}
    </Layout>
  );
}
