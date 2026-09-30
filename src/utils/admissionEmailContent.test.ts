import { describe, expect, it } from "vitest";

import type { EmailEventConfig } from "@/config/event";
import { admittedEmail, discordInviteEmail, refusedEmail, waitlistedEmail } from "@/utils/admissionEmailContent";

const CONFIG: EmailEventConfig = {
  eventName: "ConUHacks XI",
  eventDatesLabel: "Saturday, February 6 and Sunday, February 7, 2027",
  eventDatesLabelFr: "samedi 6 et dimanche 7 février 2027",
  venue: "Concordia University's John Molson Building, Montreal",
  venueFr: "l'édifice John-Molson de l'Université Concordia, Montréal",
  registrationUrl: "https://register.conuhacks.io/dashboard",
  contactEmail: "team.hackconcordia@ecaconcordia.ca",
  discordInviteUrl: null,
  travelGuidelinesUrl: null,
  travelGuidelinesUrlFr: null,
};
const ADA = { firstName: "Ada", lastName: "Lovelace" };

describe("admittedEmail", () => {
  it("names ConUHacks XI, links the dashboard and signs as HackConcordia, in both languages", () => {
    const email = admittedEmail(ADA, CONFIG);
    expect(email.subject).toBe(
      "You're in! Confirm your spot at ConUHacks XI / Vous êtes admis(e) ! Confirmez votre place à ConUHacks XI",
    );
    expect(email.text).toContain(
      "ConUHacks XI takes place on Saturday, February 6 and Sunday, February 7, 2027 at Concordia University's John Molson Building, Montreal.",
    );
    expect(email.html).toContain('<a href="https://register.conuhacks.io/dashboard">');
    expect(email.text).toContain("The HackConcordia team");
    expect(email.text).toContain("L'équipe HackConcordia");
    expect(email.text).not.toMatch(/HackDécouverte|ConUHacks X\b/);
    expect(email.text).not.toContain("Travel reimbursement");
  });

  it("adds the approved amount and the guideline links, with labels that don't name an edition", () => {
    const email = admittedEmail(
      ADA,
      { ...CONFIG, travelGuidelinesUrl: "https://example.org/en", travelGuidelinesUrlFr: "https://example.org/fr" },
      { approved: true, amount: 150, currency: "CAD" },
    );
    expect(email.text).toContain("Travel reimbursement: you are approved for up to 150 CAD.");
    expect(email.text).toContain("vous êtes admissible à un maximum de 150 CAD");
    expect(email.html).toContain('<a href="https://example.org/en">Travel Reimbursement Guidelines</a>');
    expect(email.html).toContain(
      '<a href="https://example.org/fr">Directives concernant le remboursement des frais de déplacement</a>',
    );
    expect(email.html).not.toMatch(/ConUHacks X\b/);
  });

  it("falls back to the English link for the French letter when only that one is set", () => {
    const email = admittedEmail(
      ADA,
      { ...CONFIG, travelGuidelinesUrl: "https://example.org/en" },
      { approved: true, amount: 100, currency: "USD" },
    );
    expect(email.html.match(/href="https:\/\/example\.org\/en"/g)).toHaveLength(2);
  });

  it("explains a refused request, and leaves the link out when none is configured", () => {
    expect(admittedEmail(ADA, CONFIG, { approved: false }).text).toContain("we can't offer you a travel reimbursement");
    expect(admittedEmail(ADA, CONFIG, { approved: true, amount: 100, currency: "USD" }).text).not.toContain("Eligible expenses");
  });

  it("escapes applicant names in the HTML body", () => {
    const email = admittedEmail({ firstName: "<script>alert(1)</script>", lastName: "" }, CONFIG);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("keeps names outside Latin-1", () => {
    expect(admittedEmail({ firstName: "Łukasz", lastName: "王" }, CONFIG).text).toContain("Hi Łukasz 王,");
  });
});

describe("the other decision emails", () => {
  it("name ConUHacks XI in both languages, and skip Discord without an invite URL", () => {
    expect(waitlistedEmail(ADA, CONFIG).subject).toBe(
      "ConUHacks XI application update / Mise à jour de votre candidature à ConUHacks XI",
    );
    expect(refusedEmail(ADA, CONFIG).text).toContain("Merci d'avoir posé votre candidature à ConUHacks XI.");
    expect(discordInviteEmail(ADA, CONFIG)).toBeNull();
    expect(discordInviteEmail(ADA, { ...CONFIG, discordInviteUrl: "https://discord.gg/conuhacks" })?.html).toContain(
      'href="https://discord.gg/conuhacks"',
    );
  });
});
