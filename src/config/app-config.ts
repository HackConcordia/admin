import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "HackConcordia",
  version: packageJson.version,
  copyright: `© ${currentYear}, HackConcordia.`,
  meta: {
    title: "HackConcordia",
    description: "HackConcordia admin website.",
  },
};
