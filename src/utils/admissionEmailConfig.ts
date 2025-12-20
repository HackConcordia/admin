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

    let reimbursementText = "";

    if (
      travelReimbursement?.approved &&
      travelReimbursement.amount &&
      travelReimbursement.currency
    ) {
      reimbursementText = `\n\nTravel Reimbursement:\nYou have been approved for ${travelReimbursement.amount} ${travelReimbursement.currency} in travel reimbursement. Details on how to claim your reimbursement will be provided closer to the event date.`;
    } else if (travelReimbursement?.approved === false) {
      reimbursementText = `\n\nTravel Reimbursement:\nYour travel reimbursement request has been reviewed. Unfortunately, we are unable to provide travel reimbursement at this time.`;
    }

    const msg = {
      to: email,
      from: { email: config.fromEmail, name: "HackConcordia" },
      replyTo: { email: config.replyToEmail, name: "HackConcordia" },
      subject: "Congratulations! You've Been Admitted to HackConcordia",
      text: `Dear ${firstName} ${lastName},

Congratulations! We are excited to inform you that you have been admitted to HackConcordia!

We look forward to seeing you at the event. Further details about the hackathon will be sent to you soon.
${reimbursementText}

Best regards,
The HackConcordia Team

---

This is an automated email. Please do not reply to this message.`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p><strong>Congratulations!</strong> We are excited to inform you that you have been admitted to HackConcordia!</p>

<p>We look forward to seeing you at the event. Further details about the hackathon will be sent to you soon.</p>${
        reimbursementText
          ? `<p><strong>Travel Reimbursement:</strong><br>${reimbursementText
              .replace(/\n\n/g, "<br>")
              .replace(/\n/g, "<br>")}</p>`
          : ""
      }

<p>Best regards,<br>The HackConcordia Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p style="font-size: 0.875rem; color: #666;"><em>This is an automated email. Please do not reply to this message.</em></p>`,
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

Your application has been reviewed and you have been placed on our waitlist. We will notify you if a spot becomes available.

Best regards,
The HackConcordia Team

---

Cher/Chère ${firstName} ${lastName},

Merci pour votre intérêt envers HackConcordia!

Votre candidature a été examinée et vous avez été placé sur notre liste d'attente. Nous vous informerons si une place se libère.

Cordialement,
L'équipe HackConcordia

---

This is an automated email. Please do not reply to this message.
Ceci est un courriel automatisé. Veuillez ne pas répondre à ce message.`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for your interest in HackConcordia!</p>

<p>Your application has been reviewed and you have been placed on our waitlist. We will notify you if a spot becomes available.</p>

<p>Best regards,<br>The HackConcordia Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p>Cher/Chère ${firstName} ${lastName},</p>

<p>Merci pour votre intérêt envers HackConcordia!</p>

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

Thank you for your interest in HackConcordia!

After careful consideration, we regret to inform you that we are unable to offer you a spot at this year's event. We received a large number of applications and had to make difficult decisions.

We encourage you to apply again in the future and wish you the best in your endeavors.

Best regards,
The HackConcordia Team

---

Cher/Chère ${firstName} ${lastName},

Merci pour votre intérêt envers HackConcordia!

Après un examen attentif, nous avons le regret de vous informer que nous ne sommes pas en mesure de vous offrir une place à l'événement de cette année. Nous avons reçu un grand nombre de candidatures et avons dû prendre des décisions difficiles.

Nous vous encourageons à postuler à nouveau à l'avenir et vous souhaitons le meilleur dans vos projets.

Cordialement,
L'équipe HackConcordia

---

This is an automated email. Please do not reply to this message.
Ceci est un courriel automatisé. Veuillez ne pas répondre à ce message.`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for your interest in HackConcordia!</p>

<p>After careful consideration, we regret to inform you that we are unable to offer you a spot at this year's event. We received a large number of applications and had to make difficult decisions.</p>

<p>We encourage you to apply again in the future and wish you the best in your endeavors.</p>

<p>Best regards,<br>The HackConcordia Team</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">

<p>Cher/Chère ${firstName} ${lastName},</p>

<p>Merci pour votre intérêt envers HackConcordia!</p>

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
