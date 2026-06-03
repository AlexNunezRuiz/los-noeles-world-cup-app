export type NotificationType =
  | "mention"
  | "admin_update"
  | "result_update"
  | "ranking_update"
  | "correct_prediction"
  | "config_update";

export interface ProfileRef {
  id: string;
}

export interface NotificationInsertRow {
  user_id: string;
  actor_user_id?: string | null;
  type: NotificationType;
  message_id?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
}

export interface ScoreEventRef {
  user_id: string;
  match_id: number | null;
  points: number;
  rule_key: string;
  description: string;
}

export function buildNotificationRows({
  profiles,
  excludeUserIds = new Set<string>(),
  type,
  actorUserId = null,
  messageId = null,
  title,
  body,
  link,
}: {
  profiles: ProfileRef[];
  excludeUserIds?: Set<string>;
  type: NotificationType;
  actorUserId?: string | null;
  messageId?: string | null;
  title: string;
  body: string;
  link?: string | null;
}): NotificationInsertRow[] {
  return profiles
    .filter((profile) => !excludeUserIds.has(profile.id))
    .map((profile) => ({
      user_id: profile.id,
      actor_user_id: actorUserId,
      type,
      message_id: messageId,
      title,
      body,
      link: link ?? null,
    }));
}

export function scoreEventsForMatchNotifications(events: ScoreEventRef[], matchId: number) {
  const byUser = new Map<string, ScoreEventRef & { points: number; descriptions: string[] }>();

  for (const event of events) {
    if (event.match_id !== matchId || event.points <= 0) continue;
    if (!["correct_sign", "exact_score"].includes(event.rule_key)) continue;

    const current = byUser.get(event.user_id);
    if (current) {
      current.points += event.points;
      current.descriptions.push(event.description);
    } else {
      byUser.set(event.user_id, {
        ...event,
        points: event.points,
        descriptions: [event.description],
      });
    }
  }

  return Array.from(byUser.values());
}
