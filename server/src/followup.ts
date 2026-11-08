import type { Application } from "./applications.js";
import type { Contact } from "./records.js";

export interface FollowupDraft {
  subject: string;
  body: string;
}

/**
 * Builds a follow-up email from a fixed template. Nothing is sent: the draft
 * is returned to the caller, who decides what to do with it.
 */
export function draftFollowup(app: Application, contacts: Contact[]): FollowupDraft {
  const firstName = contacts[0]?.name.split(" ")[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hello,";
  return {
    subject: `Following up on my ${app.role} application at ${app.company}`,
    body: [
      greeting,
      "",
      `I applied for the ${app.role} role at ${app.company} on ${app.date_applied} and wanted to check in on where things stand. I'm still very interested in the position.`,
      "",
      "Thank you for your time. I'd welcome any update you can share.",
      "",
      "Best regards",
    ].join("\n"),
  };
}
