"use client";

import { setActiveMember } from "@/lib/actions";
import type { Member } from "@/lib/types";

export function MemberSwitcher({
  members,
  currentMemberId,
}: {
  members: Member[];
  currentMemberId: string | null;
}) {
  return (
    <form action={setActiveMember} className="flex items-center gap-2">
      <label htmlFor="memberId" className="text-sm text-neutral-500">
        You are
      </label>
      <select
        id="memberId"
        name="memberId"
        defaultValue={currentMemberId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <option value="" disabled>
          Select…
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-sm underline">
          Set
        </button>
      </noscript>
    </form>
  );
}
