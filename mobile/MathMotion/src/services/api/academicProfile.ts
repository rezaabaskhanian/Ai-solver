import { apiClient } from './client';
import { toApiError } from './apiError';

export interface WeekdayActivity {
  day_name: string;
  completed: boolean;
  is_today: boolean;
}

export interface LeagueInfo {
  name: string;
  tier: number;
  rank: number;
  total_in_tier: number;
  days_left: number;
  icon: string;
}

export interface MonthlyAcademicStats {
  hours_studied: number;
  accuracy_rate: number;
  avg_speed_sec: number;
  solved_count: number;
  total_xp_weekly: number;
}

export interface TopicMasteryItem {
  id: string;
  title: string;
  book_title: string;
  progress: number;
  color: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  reason: string;
  action: string;
  target_id: string;
  priority: 'high' | 'normal';
}

export interface VaultCounters {
  mistakes_count: number;
  favorites_count: number;
  leitner_count: number;
}

export interface SubscriptionInfo {
  is_active: boolean;
  plan_name: string;
  expires_at?: string;
}

export interface AcademicProfile {
  id: string;
  nickname: string;
  phone?: string;
  target_goal: string;
  grade: number;
  track: string;
  level: number;
  xp: number;
  next_level_xp: number;
  gems: number;
  streak_days: number;
  streak_record: number;
  league: LeagueInfo;
  weekly_streak: WeekdayActivity[];
  monthly_stats: MonthlyAcademicStats;
  topics: TopicMasteryItem[];
  ai_insights: AIRecommendation[];
  vault: VaultCounters;
  subscription: SubscriptionInfo;
}

export interface UpdateAcademicProfileInput {
  target_goal?: string;
  grade?: number;
  track?: string;
  nickname?: string;
}

async function call<T>(request: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await request()).data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Fetches the complete academic profile, gamification stats, league standing,
 * streak, and AI recommendations for the active user/device.
 */
export async function fetchAcademicProfile(): Promise<AcademicProfile> {
  return await call(() => apiClient.get<AcademicProfile>('/api/v1/users/academic-profile'));
}

/**
 * Updates educational track, target goal, grade or nickname.
 */
export async function updateAcademicProfile(
  input: UpdateAcademicProfileInput,
): Promise<AcademicProfile> {
  return await call(() => apiClient.put<AcademicProfile>('/api/v1/users/academic-profile', input));
}

