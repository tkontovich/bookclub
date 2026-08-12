import type { Member } from "@/lib/types";

export type ScoreEntry = { score: number | null; absent: boolean };

/** Score + absent inputs for every member, named for `buildScoreRows`. */
export function ScoreRows({
  members,
  existing = {},
}: {
  members: Member[];
  existing?: Record<string, ScoreEntry | undefined>;
}) {
  return (
    <div className="space-y-2">
      {members.map((member) => {
        const entry = existing[member.id];
        return (
          <div key={member.id} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm uppercase tracking-wider text-term-fg">
              {member.name}
            </span>
            <input
              type="number"
              name={`score_${member.id}`}
              min={1}
              max={10}
              step={0.1}
              defaultValue={entry?.score ?? ""}
              placeholder="0.0"
              className="w-20 text-center"
            />
            <label className="label flex cursor-pointer items-center gap-1.5 hover:text-term-fg">
              <input
                type="checkbox"
                name={`absent_${member.id}`}
                defaultChecked={entry?.absent ?? false}
              />
              Absent
            </label>
          </div>
        );
      })}
    </div>
  );
}
