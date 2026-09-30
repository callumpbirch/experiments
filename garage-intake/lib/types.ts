export type Decision = "investigate" | "quote" | "later" | "none";
export type Issue = {
  id: string; title: string; priority: number; symptoms: string[];
  onset: string; workType: "diagnosis" | "inspect-and-quote" | "known-work";
  urgency: string; uncertainties: string[]; decision: Decision;
};
export type Message = { id: string; role: "customer" | "assistant" | "garage"; text: string; at: string };
export type Photo = { id: string; name: string; dataUrl: string; issueId: string | null };
export type Proposal = {
  id: string; text: string; sentAt: string; status: "pending" | "accepted" | "change_requested";
  response: string; decisions: { issueId: string; decision: Decision }[];
};
export type Intake = {
  version: 1; source: string; stage: "questions" | "contact" | "review" | "submitted";
  status: "draft" | "submitted" | "proposed" | "accepted" | "change_requested";
  original: string; vehicle: { description: string; registration: string };
  customer: { name: string; mobile: string }; issues: Issue[];
  preferences: { availability: string; urgency: string; constraints: string; approval: string; excludedWork: string[]; exclusionReason: string };
  answers: Record<string,string>; questionKey: string | null; safety: "urgent" | "reported-normal" | "unknown";
  photos: Photo[]; messages: Message[]; proposal: Proposal | null;
};
export type Conversation = { id: string; revision: number; createdAt: string; updatedAt: string; data: Intake };
export type Question = { key: string; text: string; example: string; choices: { label: string; value: string }[] };
export type Notification = { id: string; recipient: string; body: string; return_path: string; created_at: string };
