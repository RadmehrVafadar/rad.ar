import { JobWatch } from "@rad-ar/models/interfaces/watch.types";
import {
  canadianTechAdjacentInternshipsWatch,
  CANADIAN_TECH_ADJACENT_INTERNSHIPS_NAME,
} from "./canadian-tech-adjacent-internships.preset";

export function defaultInternshipWatch(): Partial<JobWatch> {
  return canadianTechAdjacentInternshipsWatch();
}

export const DEFAULT_WATCH_NAME = CANADIAN_TECH_ADJACENT_INTERNSHIPS_NAME;
