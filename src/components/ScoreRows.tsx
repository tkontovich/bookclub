"use client";

import { useState } from "react";
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
      {members.map((member) => (
        <ScoreRow key={member.id} member={member} entry={existing[member.id]} />
      ))}
    </div>
  );
}

/**
 * A score and "absent" are mutually exclusive, and the save treats absent as
 * the winner - so if the two disagree, whatever was typed is silently thrown
 * away. Rather than let that happen, ticking absent clears the score and
 * typing a score unticks absent.
 */
function ScoreRow({ member, entry }: { member: Member; entry?: ScoreEntry }) {
  const [absent, setAbsent] = useState(entry?.absent ?? false);
  const [score, setScore] = useState(entry?.score != null ? String(entry.score) : "");

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm uppercase tracking-wider text-term-fg">
        {member.name}
      </span>
      <input
        type="number"
        name={`score_${member.id}`}
        min={0}
        max={10}
        step={0.1}
        value={score}
        onChange={(e) => {
          setScore(e.target.value);
          if (e.target.value !== "") setAbsent(false);
        }}
        placeholder={absent ? "--" : "0.0"}
        aria-label={`${member.name} score`}
        className="w-20 text-center disabled:opacity-40"
        disabled={absent}
      />
      <label className="label flex cursor-pointer items-center gap-1.5 hover:text-term-fg">
        <input
          type="checkbox"
          name={`absent_${member.id}`}
          checked={absent}
          onChange={(e) => {
            setAbsent(e.target.checked);
            if (e.target.checked) setScore("");
          }}
        />
        Absent
      </label>
    </div>
  );
}
