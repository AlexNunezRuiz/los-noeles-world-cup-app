export interface CompetitionParticipantProfile {
  has_paid: boolean;
  is_active?: boolean | null;
}

export function isCompetitionParticipant(profile: CompetitionParticipantProfile) {
  return profile.has_paid && profile.is_active !== false;
}

export function filterCompetitionParticipants<T extends CompetitionParticipantProfile>(profiles: T[]) {
  return profiles.filter(isCompetitionParticipant);
}
