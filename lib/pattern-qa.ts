import type { ProjectState } from "./project";
import { normalizeLengthRecord, updateLengthRecord } from "./units.ts";

export const patternQaProfiles = {
  petite: { "full-bust": 32, "high-bust": 30, waist: 25, hip: 34, "back-width": 13, shoulder: 4, "back-waist": 14.5, "front-waist": 15.5, "bust-depth": 8.5, "bust-span": 7, "armhole-depth": 7.5, "dress-length": 21 },
  tall: { "full-bust": 40, "high-bust": 37, waist: 33, hip: 40, "back-width": 16, shoulder: 5.25, "back-waist": 18, "front-waist": 19.25, "bust-depth": 11, "bust-span": 8.5, "armhole-depth": 9.5, "dress-length": 27 },
  "full-bust": { "full-bust": 46, "high-bust": 38, waist: 36, hip: 43, "back-width": 15.5, shoulder: 4.75, "back-waist": 16.5, "front-waist": 19, "bust-depth": 12, "bust-span": 9, "armhole-depth": 9, "dress-length": 25 },
  straight: { "full-bust": 36, "high-bust": 34, waist: 34, hip: 37, "back-width": 15, shoulder: 4.75, "back-waist": 16, "front-waist": 16.75, "bust-depth": 9.75, "bust-span": 7.75, "armhole-depth": 8.25, "dress-length": 23 },
  "full-hip": { "full-bust": 36, "high-bust": 34, waist: 29, hip: 44, "back-width": 14.5, shoulder: 4.5, "back-waist": 15.75, "front-waist": 16.75, "bust-depth": 9.75, "bust-span": 8, "armhole-depth": 8.25, "dress-length": 24 },
  "broad-shoulder": { "full-bust": 40, "high-bust": 38, waist: 32, hip: 39, "back-width": 17, shoulder: 5.5, "back-waist": 14.75, "front-waist": 16, "bust-depth": 9.5, "bust-span": 8.5, "armhole-depth": 8.25, "dress-length": 22.5 },
} as const;

export type PatternQaProfile = keyof typeof patternQaProfiles;

export function applyPatternQaProfile(project: ProjectState, profile: PatternQaProfile): ProjectState {
  const values = patternQaProfiles[profile];
  return {
    ...project,
    measurements: project.measurements.map((measurement) => {
      if (!(measurement.id in values)) return normalizeLengthRecord(measurement, project.unitSystem);
      const captured = updateLengthRecord(measurement, String(values[measurement.id as keyof typeof values]), "imperial");
      return normalizeLengthRecord(captured, project.unitSystem);
    }),
  };
}
