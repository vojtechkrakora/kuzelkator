import { z } from "zod";
import {
  playerSchema,
  playerResultSchema,
  teamSchema,
  competitionSchema,
  matchSchema,
} from "./models";
export const profileSchema = playerSchema.extend({
  club: z.object({ id: z.number().int(), name: z.string() }).nullish(),
});
export type PlayerProfile = z.infer<typeof profileSchema>;
export const directoryRowSchema = z.object({
  player: playerSchema,
  team: teamSchema.nullish(),
  competition: competitionSchema.nullish(),
});
export type DirectoryPlayer = z.infer<typeof playerSchema> & {
  teams: string[];
};
export const historySchema = playerResultSchema.extend({
  teamMatchResult: z
    .object({
      isHome: z.boolean(),
      team: teamSchema.nullish(),
      teamMatch: matchSchema,
      substitutions: z
        .array(
          z.object({
            id: z.number().int(),
            throwNumber: z.number().nullish(),
            playerOut: playerSchema.nullish(),
            playerIn: playerSchema.nullish(),
          }),
        )
        .optional(),
    })
    .nullish(),
});
export type PlayerHistory = z.infer<typeof historySchema>;
export function normaliseName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs")
    .trim();
}
export function searchPlayers(items: DirectoryPlayer[], query: string) {
  const words = normaliseName(query).split(/\s+/).filter(Boolean);
  return items.filter((p) =>
    words.every((word) =>
      normaliseName([p.firstName, p.lastName, ...p.teams].join(" ")).includes(
        word,
      ),
    ),
  );
}
