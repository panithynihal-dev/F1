// Response shapes for the two public APIs, ported from the app's data/model/*.kt. Field names are
// the wire names, so nothing needs mapping on the way in.

// ---- OpenF1 ----

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name?: string | null;
  location?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  circuit_key?: number | null;
  circuit_short_name?: string | null;
  circuit_image?: string | null;
  date_start: string;
  date_end?: string | null;
  gmt_offset?: string | null;
  year: number;
}

export interface Session {
  session_key: number;
  meeting_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end?: string | null;
  location?: string | null;
  country_name?: string | null;
  circuit_short_name?: string | null;
  year: number;
  is_cancelled?: boolean;
}

export interface DriverPosition {
  session_key: number;
  driver_number: number;
  date: string;
  position: number;
}

// Both gap fields are polymorphic in the feed: a number of seconds for a car on the lead lap, a
// string such as "+1 LAP" for a lapped one.
export interface RaceInterval {
  session_key: number;
  driver_number: number;
  date: string;
  interval?: number | string | null;
  gap_to_leader?: number | string | null;
}

export interface PitStopEvent {
  session_key: number;
  driver_number: number;
  date: string;
  lap_number?: number | null;
  pit_duration?: number | null;
  lane_duration?: number | null;
  stop_duration?: number | null;
}

export interface RaceControlMessage {
  session_key: number;
  date: string;
  driver_number?: number | null;
  lap_number?: number | null;
  category: string;
  flag?: string | null;
  scope?: string | null;
  sector?: number | null;
  qualifying_phase?: string | null;
  message: string;
}

export interface Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start?: string | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  is_pit_out_lap?: boolean | null;
  lap_duration?: number | null;
}

export interface CarLocation {
  session_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  compound?: string | null;
  lap_start?: number | null;
  lap_end?: number | null;
  tyre_age_at_start?: number | null;
}

export interface Driver {
  session_key: number;
  driver_number: number;
  broadcast_name?: string | null;
  full_name?: string | null;
  name_acronym?: string | null;
  team_name?: string | null;
  team_colour?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  country_code?: string | null;
  headshot_url?: string | null;
}

// ---- Jolpica ----

export interface JolpicaDriver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  url?: string;
  givenName: string;
  familyName: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface JolpicaConstructor {
  constructorId: string;
  url?: string;
  name: string;
  nationality?: string;
}

export interface Circuit {
  circuitId: string;
  url?: string;
  circuitName: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

export interface SessionTime {
  date: string;
  time?: string;
}

export interface RaceSchedule {
  season: string;
  round: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time?: string;
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  Qualifying?: SessionTime;
  Sprint?: SessionTime;
  SprintQualifying?: SessionTime;
}

export interface DriverStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
}

export interface ConstructorStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: JolpicaConstructor;
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis?: string; time: string };
  FastestLap?: { rank?: string; lap?: string; Time?: { time: string } };
}

export interface QualifyingResult {
  number: string;
  position: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface RaceWithResults {
  season: string;
  round: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time?: string;
  Results?: RaceResult[];
  SprintResults?: RaceResult[];
  QualifyingResults?: QualifyingResult[];
}

export interface MRData<T> {
  MRData: T & { total: string; limit: string; offset: string };
}
