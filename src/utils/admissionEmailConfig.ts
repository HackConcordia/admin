import sgMail from "@sendgrid/mail";

interface TravelReimbursementData {
  approved: boolean;
  amount?: number;
  currency?: string;
}

function getSendGridConfig() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;
  const replyToEmail =
    process.env.CONTACT_EMAIL || "team.hackconcordia@ecaconcordia.ca";

  if (!apiKey) {
    console.warn(
      "SENDGRID_API_KEY is not configured. Emails will not be sent."
    );
    return null;
  }

  sgMail.setApiKey(apiKey);
  return { fromEmail, replyToEmail };
}

export async function sendAdmittedEmail(
  email: string,
  firstName: string,
  lastName: string,
  travelReimbursement?: TravelReimbursementData
): Promise<boolean> {
  try {
    const config = getSendGridConfig();

    if (!config) {
      console.log(
        `[Email Stub] Admitted -> to: ${email}, name: ${firstName} ${lastName}, travel: ${JSON.stringify(
          travelReimbursement
        )}`
      );
      return true;
    }

    // Determine travel reimbursement text based on scenario
    let travelTextEnglish = "";
    let travelTextFrench = "";
    let travelHtmlEnglish = "";
    let travelHtmlFrench = "";

    if (
      travelReimbursement?.approved &&
      travelReimbursement.amount &&
      travelReimbursement.currency
    ) {
      // Travel reimbursement accepted
      travelTextEnglish = `
Travel Reimbursement:

You have been approved for a travel reimbursement of up to $${travelReimbursement.amount} ${travelReimbursement.currency}. Please refer to the following document for further guidelines on eligible reimbursement expenses: https://drive.google.com/file/d/1-7HbWwvpoTLa2Mpw406qMu4K0Dit9GOt/view?usp=drive_link. Instructions on how to submit reimbursement requests will be provided closer to the event date.
`;
      travelTextFrench = `
Remboursement des frais de déplacement :

Vous avez été approuvé pour un remboursement de voyage d'un montant maximum de $${travelReimbursement.amount} ${travelReimbursement.currency}. Veuillez consulter le document suivant pour plus de détails sur les dépenses éligibles au remboursement: https://drive.google.com/file/d/1Bqh9FSkdL2RlPJEXvq7vAmCLb-T9pM1W/view?usp=drive_link. Les instructions sur la façon de soumettre les demandes de remboursement seront fournies à l'approche de la date de l'événement.
`;
      travelHtmlEnglish = `
<p><strong>Travel Reimbursement:</strong></p>
<p>You have been approved for a travel reimbursement of <strong>up to $${travelReimbursement.amount} ${travelReimbursement.currency}.</strong> Please refer to the following document for further guidelines on eligible reimbursement expenses: <a href="https://drive.google.com/file/d/1-7HbWwvpoTLa2Mpw406qMu4K0Dit9GOt/view?usp=drive_link">ConUHacks X Travel Reimbursement Guidelines</a>. Instructions on how to submit reimbursement requests will be provided closer to the event date.</p>
`;
      travelHtmlFrench = `
<p><strong>Remboursement des frais de déplacement :</strong></p>
<p>Vous avez été approuvé pour un remboursement de voyage d'un montant <strong>maximum de $${travelReimbursement.amount} ${travelReimbursement.currency}.</strong> Veuillez consulter le document suivant pour plus de détails sur les dépenses éligibles au remboursement: <a href="https://drive.google.com/file/d/1Bqh9FSkdL2RlPJEXvq7vAmCLb-T9pM1W/view?usp=drive_link">Directives concernant le remboursement des frais de déplacement pour ConUHacks X</a>. Les instructions sur la façon de soumettre les demandes de remboursement seront fournies à l'approche de la date de l'événement.</p>
`;
    } else if (travelReimbursement?.approved === false) {
      // Travel reimbursement rejected
      travelTextEnglish = `
Travel Reimbursement:

We received a large number of travel reimbursement applications this year, and after careful consideration, we regret to inform you that we are not able to provide you with a travel reimbursement at this time. Regardless, we still hope to see you at ConUHacks X.
`;
      travelTextFrench = `
Remboursement des frais de déplacement :

Nous avons reçu un grand nombre de demandes de remboursement de voyage cette année, et après une étude approfondie, nous avons le regret de vous informer que nous ne sommes pas en mesure de vous offrir un remboursement de voyage pour le moment. Néanmoins, nous espérons toujours vous voir à ConUHacks X.
`;
      travelHtmlEnglish = `
<p><strong>Travel Reimbursement:</strong></p>
<p>We received a large number of travel reimbursement applications this year, and after careful consideration, we regret to inform you that we are not able to provide you with a travel reimbursement at this time. Regardless, we still hope to see you at ConUHacks X.</p>
`;
      travelHtmlFrench = `
<p><strong>Remboursement des frais de déplacement :</strong></p>
<p>Nous avons reçu un grand nombre de demandes de remboursement de voyage cette année, et après une étude approfondie, nous avons le regret de vous informer que nous ne sommes pas en mesure de vous offrir un remboursement de voyage pour le moment. Néanmoins, nous espérons toujours vous voir à ConUHacks X.</p>
`;
    }
    // If travelReimbursement is undefined/null, no travel section is included

    const msg = {
      to: email,
      from: { email: config.fromEmail, name: "HackConcordia" },
      replyTo: { email: config.replyToEmail, name: "HackConcordia" },
      subject:
        "You have been accepted to ConUHacks X, please confirm your attendance! // Vous avez été accepté à ConUHacks X, veuillez confirmer votre présence!",
      text: `Version française ci-dessous

Dear ${firstName} ${lastName},

Congratulations! We are excited to inform you that you have been admitted to ConUHacks X!
${travelTextEnglish}
Please confirm (or decline) your attendance here: https://register.conuhacks.io/

ConUHacks X will take place from Saturday, January 24th to Sunday, January 25th at Concordia University's John Molson Building (1600 Blvd. De Maisonneuve Ouest, Montreal, Quebec H3H 0A1).

Feel free to reach out to team.hackconcordia@ecaconcordia.ca if you have any questions or concerns.

We hope to see you there,

The HackConcordia Team

---

Cher(ère) ${firstName} ${lastName},

Félicitations! Nous sommes heureux de vous informer que vous avez été admis à ConUHacks X!
${travelTextFrench}
Veuillez confirmer (ou refuser) votre participation ici: https://register.conuhacks.io/

ConUHacks X se déroulera du samedi 24 janvier au dimanche 25 janvier à l'édifice John Molson de l'Université Concordia (1600 Boulevard De Maisonneuve Ouest, Montréal, Québec H3H 0A1).

N'hésitez pas à contacter team.hackconcordia@ecaconcordia.ca si vous avez des questions ou des préoccupations.

Nous espérons vous y voir,

L'équipe HackConcordia`,
      html: `<p><em>Version française ci-dessous</em></p>

<p>Dear ${firstName} ${lastName},</p>

<p><strong>Congratulations!</strong> We are excited to inform you that you have been admitted to ConUHacks X!</p>
${travelHtmlEnglish}
<p>Please <strong>confirm (or decline) your attendance</strong> here: <a href="https://register.conuhacks.io/">https://register.conuhacks.io/</a></p>

<p>ConUHacks X will take place from Saturday, January 24th to Sunday, January 25th at Concordia University's John Molson Building (1600 Blvd. De Maisonneuve Ouest, Montreal, Quebec H3H 0A1).</p>

<p>Feel free to reach out to <a href="mailto:team.hackconcordia@ecaconcordia.ca">team.hackconcordia@ecaconcordia.ca</a> if you have any questions or concerns.</p>

<p>We hope to see you there,</p>

<p>The HackConcordia Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p>Cher(ère) ${firstName} ${lastName},</p>

<p><strong>Félicitations!</strong> Nous sommes heureux de vous informer que vous avez été admis à ConUHacks X!</p>
${travelHtmlFrench}
<p>Veuillez <strong>confirmer (ou refuser) votre participation</strong> ici: <a href="https://register.conuhacks.io/">https://register.conuhacks.io/</a></p>

<p>ConUHacks X se déroulera du samedi 24 janvier au dimanche 25 janvier à l'édifice John Molson de l'Université Concordia (1600 Boulevard De Maisonneuve Ouest, Montréal, Québec H3H 0A1).</p>

<p>N'hésitez pas à contacter <a href="mailto:team.hackconcordia@ecaconcordia.ca">team.hackconcordia@ecaconcordia.ca</a> si vous avez des questions ou des préoccupations.</p>

<p>Nous espérons vous y voir,</p>

<p>L'équipe HackConcordia</p>`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Successfully sent admission email to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send admission email:", error);
    return false;
  }
}

export async function sendWaitlistedEmail(
  email: string,
  firstName: string,
  lastName: string
): Promise<boolean> {
  try {
    const config = getSendGridConfig();

    if (!config) {
      console.log(
        `[Email Stub] Waitlisted -> to: ${email}, name: ${firstName} ${lastName}`
      );
      return true;
    }

    const msg = {
      to: email,
      from: { email: config.fromEmail, name: "HackConcordia" },
      replyTo: { email: config.replyToEmail, name: "HackConcordia" },
      subject:
        "HackConcordia Application Update - Waitlisted / Mise à jour de votre candidature - Liste d'attente",
      text: `Dear ${firstName} ${lastName},

Thank you for your interest in HackConcordia!

Your application has been reviewed and you have been placed on our waitlist for ConUHacks X. We will notify you if a spot becomes available.

Best regards,
The HackConcordia Team

---

Cher/Chère ${firstName} ${lastName},

Merci pour votre intérêt envers HackConcordia!

Votre candidature a été examinée et vous avez été placé sur notre liste d'attente pour ConUHacks X. Nous vous informerons si une place se libère.

Cordialement,
L'équipe HackConcordia

---

This is an automated email. Please do not reply to this message.
Ceci est un courriel automatisé. Veuillez ne pas répondre à ce message.`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for your interest in ConUHacks X!</p>

<p>Your application has been reviewed and you have been placed on our waitlist. We will notify you if a spot becomes available.</p>

<p>Best regards,<br>The HackConcordia Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p>Cher/Chère ${firstName} ${lastName},</p>

<p>Merci pour votre intérêt envers ConUHacks X!</p>

<p>Votre candidature a été examinée et vous avez été placé sur notre liste d'attente. Nous vous informerons si une place se libère.</p>

<p>Cordialement,<br>L'équipe HackConcordia</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p style="font-size: 0.875rem; color: #666;"><em>This is an automated email. Please do not reply to this message.<br>Ceci est un courriel automatisé. Veuillez ne pas répondre à ce message.</em></p>`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Successfully sent waitlist email to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send waitlist email:", error);
    return false;
  }
}

export async function sendRefusedEmail(
  email: string,
  firstName: string,
  lastName: string
): Promise<boolean> {
  try {
    const config = getSendGridConfig();

    if (!config) {
      console.log(
        `[Email Stub] Refused -> to: ${email}, name: ${firstName} ${lastName}`
      );
      return true;
    }

    const msg = {
      to: email,
      from: { email: config.fromEmail, name: "HackConcordia" },
      replyTo: { email: config.replyToEmail, name: "HackConcordia" },
      subject:
        "HackConcordia Application Update / Mise à jour de votre candidature",
      text: `Dear ${firstName} ${lastName},

Thank you for your interest in ConUHacks X!

After careful consideration, we regret to inform you that we are unable to offer you a spot at this year's event. We received a large number of applications and had to make difficult decisions.

We encourage you to apply again in the future and wish you the best in your endeavors.

Best regards,
The HackConcordia Team

---

Cher/Chère ${firstName} ${lastName},

Merci pour votre intérêt envers ConUHacks X!

Après un examen attentif, nous avons le regret de vous informer que nous ne sommes pas en mesure de vous offrir une place à l'événement de cette année. Nous avons reçu un grand nombre de candidatures et avons dû prendre des décisions difficiles.

Nous vous encourageons à postuler à nouveau à l'avenir et vous souhaitons le meilleur dans vos projets.

Cordialement,
L'équipe HackConcordia

---

This is an automated email. Please do not reply to this message.
Ceci est un courriel automatisé. Veuillez ne pas répondre à ce message.`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for your interest in ConUHacks X!</p>

<p>After careful consideration, we regret to inform you that we are unable to offer you a spot at this year's event. We received a large number of applications and had to make difficult decisions.</p>

<p>We encourage you to apply again in the future and wish you the best in your endeavors.</p>

<p>Best regards,<br>The HackConcordia Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p>Cher/Chère ${firstName} ${lastName},</p>

<p>Merci pour votre intérêt envers ConUHacks X!</p>

<p>Après un examen attentif, nous avons le regret de vous informer que nous ne sommes pas en mesure de vous offrir une place à l'événement de cette année. Nous avons reçu un grand nombre de candidatures et avons dû prendre des décisions difficiles.</p>

<p>Nous vous encourageons à postuler à nouveau à l'avenir et vous souhaitons le meilleur dans vos projets.</p>

<p>Cordialement,<br>L'équipe HackConcordia</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p style="font-size: 0.875rem; color: #666;"><em>This is an automated email. Please do not reply to this message.<br>Ceci est un courriel automatisé. Veuillez ne pas répondre à ce message.</em></p>`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Successfully sent rejection email to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send rejection email:", error);
    return false;
  }
}
