export type BoardType = 'CBSE' | 'ICSE' | 'STATE BOARD' | 'OTHER' | 'UNKNOWN';

export type SchoolType =
  | 'PRIMARY'
  | 'HIGH SCHOOL'
  | 'COMPOSITE'
  | 'INTERNATIONAL'
  | 'PRE-SCHOOL'
  | 'PLAY SCHOOL'
  | 'NURSERY'
  | 'MONTESSORI'
  | 'KINDERGARTEN'
  | 'OTHER';

export type VisitStatus =
  | 'NOT VISITED'
  | 'VISITED'
  | 'REVISIT REQUIRED'
  | 'INTERESTED'
  | 'FOLLOW-UP'
  | 'REGISTRATION'
  | 'NOT INTERESTED'
  | 'CLOSED';

export type OpportunityType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type ProgrammeType = 'MOM' | 'Junior Power Quest' | 'Both' | 'Other' | 'Needs Assessment';

export type TravelMode = 'TWO_WHEELER' | 'DRIVE';

export interface SchoolData {
  id: string;
  school_id: string;
  s_no: number;
  school_name: string;
  school_code?: string | null;
  board: string;
  medium: string;
  school_type: string;
  category?: string | null;
  address: string;
  area: string;
  taluk?: string | null;
  district: string;
  state: string;
  pincode?: string | null;
  latitude: number;
  longitude: number;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  principal_name?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  student_strength?: number | null;
  classes_available?: string | null;
  nursery_available: boolean;
  lkg_available: boolean;
  ukg_available: boolean;
  primary_available: boolean;
  secondary_available: boolean;
  status: string;
  visit_status: string;
  last_visit_date?: string | Date | null;
  next_followup_date?: string | Date | null;
  priority: string;
  opportunity_type: string;
  recommended_programme: string;
  notes?: string | null;
  is_user_school: boolean;
  visited_by_current_user: boolean;
  visited_by_previous_rep: boolean;
  previous_rep_visit_date?: string | Date | null;
  previous_rep_notes?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
  visits?: SchoolVisitData[];
  distance_from_base_km?: number;
}

export interface SchoolVisitData {
  id: string;
  school_id: string;
  school?: SchoolData;
  visit_date: string | Date;
  representative: string;
  representative_id?: string | null;
  is_current_representative: boolean;
  visit_type: 'FIRST_VISIT' | 'REVISIT' | 'FOLLOW_UP_VISIT';
  purpose: string;
  programme_discussed: string;
  contact_person?: string | null;
  contact_number?: string | null;
  designation?: string | null;
  interest_level: string;
  outcome: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_from_school?: number | null;
  location_verified: boolean;
  follow_up_date?: string | Date | null;
  follow_up_time?: string | null;
  registration_status?: string | null;
  photo_url?: string | null;
  created_at?: string | Date;
}

export interface RouteStopData {
  id: string;
  route_plan_id: string;
  school_id: string;
  school: SchoolData;
  stop_number: number;
  optimized_sequence: number;
  leg_distance_meters?: number | null;
  leg_distance_km?: number | null;
  leg_duration_seconds?: number | null;
  leg_duration_formatted?: string | null;
  status: 'PENDING' | 'VISITED' | 'SKIPPED';
  notes?: string | null;
}

export interface RoutePlanData {
  id: string;
  date: string;
  name?: string | null;
  origin: string;
  origin_lat: number;
  origin_lng: number;
  destination: string;
  destination_lat: number;
  destination_lng: number;
  travel_mode: TravelMode;
  total_distance_meters: number;
  total_distance_km: number;
  total_duration_seconds: number;
  total_duration_formatted: string;
  optimized_order: string; // JSON string of school IDs
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  remarks?: string | null;
  is_locked: boolean;
  day_type: 'FULL_DAY' | 'HALF_DAY' | 'HOLIDAY';
  stops: RouteStopData[];
  is_simulated?: boolean;
  notes?: string | null;
}

export interface FollowUpData {
  id: string;
  school_id: string;
  school?: SchoolData;
  visit_id?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  due_date: string | Date;
  due_time?: string | null;
  status: 'Pending' | 'Today' | 'Overdue' | 'Completed' | 'Cancelled';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string | null;
  outcome?: string | null;
}

export interface DailySummaryData {
  id: string;
  date: string;
  schools_planned: number;
  schools_visited: number;
  schools_not_visited: number;
  revisits: number;
  interested: number;
  followups: number;
  registrations: number;
  not_interested: number;
  total_distance_km: number;
  total_travel_time?: string | null;
  remarks?: string | null;
  ai_summary?: string | null;
}

export interface SettingsData {
  id: string;
  current_user_id: string;
  user_name: string;
  user_role: string;
  company: string;
  base_address: string;
  base_latitude: number;
  base_longitude: number;
  working_radius_km: number;
  default_daily_schools: number;
  preferred_travel_mode: TravelMode;
  gps_verification_radius_meters: number;
  target_total_schools: number;
  target_schools_per_week: number;
  target_progress_goal: number;
  weekly_holiday: string;
  target_completion_date: string;
  mom_pitch?: string | null;
  junior_quest_pitch?: string | null;
  faq_objections?: string | null;
}

export interface RouteOptimizationRequest {
  origin: {
    address: string;
    lat: number;
    lng: number;
  };
  destination: {
    address: string;
    lat: number;
    lng: number;
  };
  intermediateSchoolIds: string[];
  travelMode?: TravelMode;
  date?: string;
}

export interface RouteLeg {
  fromName: string;
  toName: string;
  distanceKm: number;
  distanceMeters: number;
  durationFormatted: string;
  durationSeconds: number;
}

export interface RouteOptimizationResult {
  optimizedOrder: string[]; // school IDs in optimized stop order
  optimizedIndices: number[]; // relative 0-indexed positions from input
  totalDistanceKm: number;
  totalDistanceMeters: number;
  totalDurationFormatted: string;
  totalDurationSeconds: number;
  travelMode: TravelMode;
  legs: RouteLeg[];
  isFallbackDrive?: boolean;
  isSimulated?: boolean;
  googleMapsDirectionsUrl: string;
}
