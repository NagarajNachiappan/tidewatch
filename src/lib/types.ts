/** A single high or low water event at one station. */
export interface Tide {
  /**
   * Wall-clock time at the station, "HH:mm", 24-hour.
   * Deliberately a string and not a Date: NOAA sends no timezone marker, so
   * `new Date("2026-08-29 04:37")` would be parsed in the *server's* zone and
   * be correct only by accident on a machine set to Pacific.
   */
  time: string
  type: 'high' | 'low'
  /** Height above the datum, in feet. */
  feet: number
}

/** Every tide for one station on one day. */
export interface TideDay {
  stationId: string
  stationName: string
  /** ISO "YYYY-MM-DD", local to the station. */
  date: string
  /** Vertical reference the heights are measured from. */
  datum: string
  tides: Tide[]
}
