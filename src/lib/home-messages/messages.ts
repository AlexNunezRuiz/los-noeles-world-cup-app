export type HomeMessageTone = "info" | "payment" | "warning" | "success";

export interface HomeMessage {
  id: string;
  slug: string;
  title: string;
  body: string;
  link_label: string | null;
  link_href: string | null;
  tone: HomeMessageTone;
  is_published: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpecialHomeMessages {
  payment: HomeMessage | null;
  install: HomeMessage | null;
  general: HomeMessage[];
}

export function getSpecialHomeMessages(messages: HomeMessage[]): SpecialHomeMessages {
  const published = messages.filter((message) => message.is_published);
  const payment = published.find((message) => message.slug === "payment-info") ?? null;
  const install = published.find((message) => message.slug === "install-info") ?? null;

  return {
    payment,
    install,
    general: published.filter(
      (message) => message.slug !== "payment-info" && message.slug !== "install-info"
    ),
  };
}

export function summarizeHomeMessageBody(body: string, maxLength = 120) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function buildHomeMessageNotification(message: HomeMessage) {
  return {
    title: message.title,
    body: summarizeHomeMessageBody(message.body),
    link: "/porra",
  };
}
