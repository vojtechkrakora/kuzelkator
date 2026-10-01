import { ArrowDownUp } from "lucide-react";
import { playerName, type Match } from "../domain/models";

export function MatchSubstitutions({
  result,
}: {
  result: NonNullable<Match["results"]>[number] | undefined;
}) {
  if (!result?.substitutions?.length) return null;

  return (
    <details className="match-substitutions">
      <summary>
        <ArrowDownUp size={14} aria-hidden="true" /> Střídání (
        {result.substitutions.length})
      </summary>
      <ul>
        {result.substitutions.map((substitution) => (
          <li key={substitution.id}>
            <span className="substitution-throw">
              {substitution.throwNumber != null
                ? `Od ${substitution.throwNumber}. hodu`
                : "Hod neuveden"}
            </span>
            <dl>
              <div>
                <dt>Odchází</dt>
                <dd>{playerName(substitution.playerOut)}</dd>
              </div>
              <div>
                <dt>Nastupuje</dt>
                <dd>{playerName(substitution.playerIn)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </details>
  );
}
