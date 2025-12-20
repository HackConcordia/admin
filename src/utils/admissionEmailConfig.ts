import sgMail from "@sendgrid/mail";

interface TravelReimbursementData {
  approved: boolean;
  amount?: number;
  currency?: string;
}

function getSendGridConfig() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@hackconcordia.ca";

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY is not configured. Emails will not be sent.");
    return null;
  }

  sgMail.setApiKey(apiKey);
  return { fromEmail };
}

export async function sendAdmittedEmail(
  email: string,
  firstName: string,
  lastName: string,
  travelReimbursement?: TravelReimbursementData,
): Promise<boolean> {
  try {
    const config = getSendGridConfig();

    if (!config) {
      console.log(
        `[Email Stub] Admitted -> to: ${email}, name: ${firstName} ${lastName}, travel: ${JSON.stringify(travelReimbursement)}`,
      );
      return true;
    }

    let reimbursementText = "";
    if (travelReimbursement?.approved && travelReimbursement.amount && travelReimbursement.currency) {
      reimbursementText = `\n\nTravel Reimbursement:\nYou have been approved for ${travelReimbursement.amount} ${travelReimbursement.currency} in travel reimbursement. Details on how to claim your reimbursement will be provided closer to the event date.`;
    } else if (travelReimbursement?.approved === false) {
      reimbursementText = `\n\nTravel Reimbursement:\nYour travel reimbursement request has been reviewed. Unfortunately, we are unable to provide travel reimbursement at this time.`;
    }

    const msg = {
      to: email,
      from: { email: config.fromEmail, name: "HackConcordia" },
      subject: "Congratulations! You've Been Admitted to HackConcordia",
      text: `Dear ${firstName} ${lastName},

Congratulations! We are excited to inform you that you have been admitted to HackConcordia!

We look forward to seeing you at the event. Further details about the hackathon will be sent to you soon.${reimbursementText}

Best regards,
The HackConcordia Team`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p><strong>Congratulations!</strong> We are excited to inform you that you have been admitted to HackConcordia!</p>

<p>We look forward to seeing you at the event. Further details about the hackathon will be sent to you soon.</p>${reimbursementText ? `<p><strong>Travel Reimbursement:</strong><br>${reimbursementText.replace(/\n\n/g, "<br>").replace(/\n/g, "<br>")}</p>` : ""}

<p>Best regards,<br>The HackConcordia Team</p>`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Successfully sent admission email to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send admission email:", error);
    return false;
  }
}

export async function sendWaitlistedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  try {
    const config = getSendGridConfig();

    if (!config) {
      console.log(`[Email Stub] Waitlisted -> to: ${email}, name: ${firstName} ${lastName}`);
      return true;
    }

    const msg = {
      to: email,
      from: config.fromEmail,
      subject: "HackConcordia Application Update - Waitlisted",
      text: `Dear ${firstName} ${lastName},

Thank you for your interest in HackConcordia!

Your application has been reviewed and you have been placed on our waitlist. We will notify you if a spot becomes available.

Best regards,
The HackConcordia Team`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for your interest in HackConcordia!</p>

<p>Your application has been reviewed and you have been placed on our waitlist. We will notify you if a spot becomes available.</p>

<p>Best regards,<br>The HackConcordia Team</p>`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Successfully sent waitlist email to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send waitlist email:", error);
    return false;
  }
}

export async function sendRefusedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  try {
    const config = getSendGridConfig();

    if (!config) {
      console.log(`[Email Stub] Refused -> to: ${email}, name: ${firstName} ${lastName}`);
      return true;
    }

    const msg = {
      to: email,
      from: config.fromEmail,
      subject: "HackConcordia Application Update",
      text: `Dear ${firstName} ${lastName},

Thank you for your interest in HackConcordia!

After careful consideration, we regret to inform you that we are unable to offer you a spot at this year's event. We received a large number of applications and had to make difficult decisions.

We encourage you to apply again in the future and wish you the best in your endeavors.

Best regards,
The HackConcordia Team`,
      html: `<p>Dear ${firstName} ${lastName},</p>

<p>Thank you for your interest in HackConcordia!</p>

<p>After careful consideration, we regret to inform you that we are unable to offer you a spot at this year's event. We received a large number of applications and had to make difficult decisions.</p>

<p>We encourage you to apply again in the future and wish you the best in your endeavors.</p>

<p>Best regards,<br>The HackConcordia Team</p>`,
    };

    await sgMail.send(msg);
    console.log(`[Email] Successfully sent rejection email to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send rejection email:", error);
    return false;
  }
}
