import { z } from "zod";
import { teamRecordsSchema } from "../domain/next-opponent";
import { apiCache } from "./cache";

export const teamRecordsInput = z.object({
  teamId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  competitionId: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
});
export function getTeamRecords(input: z.infer<typeof teamRecordsInput>) {
  return apiCache.get(
    `/teams/${input.teamId}/records?competitionId=${input.competitionId}`,
    teamRecordsSchema,
    300000,
  );
}
