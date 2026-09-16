"use client";

import { useState, useTransition } from "react";
import { addMember, removeMember, updateMember } from "@/lib/actions";
import type { ActionResult } from "@/lib/types";
import { Modal } from "./Modal";

export type MemberAdminView = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
};

export function MembersAdmin({ members }: { members: MemberAdminView[] }) {
  const [editing, setEditing] = useState<MemberAdminView | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Actions return failures rather than throwing: a thrown error loses its
  // message in production and surfaces as React error #441.
  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const outcome = await addMember(formData);
      if (!outcome.ok) setError(outcome.message);
    });
  }

  return (
    <div className="space-y-3">
      <div className="border border-term-fg/25">
        <div className="label hidden gap-4 border-b border-term-fg/25 px-3 py-2 sm:flex">
          <span className="w-36 shrink-0">Name</span>
          <span className="flex-1">Email</span>
        </div>
        <ul className="divide-y divide-term-fg/15">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
                <span
                  className={
                    member.active
                      ? "block truncate text-sm uppercase tracking-wider text-term-bright sm:w-36 sm:shrink-0"
                      : "block truncate text-sm uppercase tracking-wider text-term-dim line-through sm:w-36 sm:shrink-0"
                  }
                >
                  {member.name}
                </span>
                {member.active && (
                  <span className="block truncate text-xs text-term-fg sm:text-sm">
                    {member.email || <span className="text-term-dim">No email</span>}
                  </span>
                )}
              </div>
              {member.active ? (
                <button
                  type="button"
                  onClick={() => setEditing(member)}
                  className="label shrink-0 hover:text-term-fg"
                >
                  [ Edit ]
                </button>
              ) : (
                <span className="label shrink-0">Removed</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-term-dim">
        Emails are only used for calendar invites, and are left out of the public backups. Changing
        them doesn&apos;t email anyone - resend the invite from below to apply changes.
      </p>

      {error && (
        <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
          ! {error}
        </p>
      )}

      <form action={handleAdd} className="flex flex-wrap items-center gap-2 pt-1">
        <input type="text" name="name" placeholder="FIRST NAME" required className="min-w-32 flex-1" />
        <input type="email" name="email" placeholder="EMAIL" className="min-w-48 flex-[2]" />
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Adding…" : "Add"}
        </button>
      </form>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit member">
        {editing && (
          <MemberEditForm
            key={editing.id}
            member={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MemberEditForm({
  member,
  onDone,
}: {
  member: MemberAdminView;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run(
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
  ) {
    setError(null);
    startTransition(async () => {
      const outcome = await action(formData);
      if (outcome.ok) onDone();
      else setError(outcome.message);
    });
  }

  return (
    <form action={(formData) => run(updateMember, formData)} className="space-y-4">
      <input type="hidden" name="memberId" value={member.id} />

      <div className="space-y-1.5">
        <label htmlFor="memberName" className="label block">
          First name
        </label>
        <input
          id="memberName"
          type="text"
          name="name"
          defaultValue={member.name}
          required
          className="w-full"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="memberEmail" className="label block">
          Email
        </label>
        <input
          id="memberEmail"
          type="email"
          name="email"
          defaultValue={member.email ?? ""}
          placeholder="FOR CALENDAR INVITES"
          className="w-full"
        />
      </div>

      {error && (
        <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
          ! {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onDone} className="btn">
          Cancel
        </button>
      </div>

      <div className="space-y-2 border-t border-term-fg/25 pt-4">
        {confirming ? (
          <div className="space-y-3 border border-term-fg/40 bg-term-fg/10 p-3">
            <p className="text-xs uppercase tracking-widest text-term-bright">
              Remove {member.name} from the club?
            </p>
            <p className="text-xs text-term-dim">
              Their past scores stay. They drop off score entry and future invites.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const data = new FormData();
                  data.set("memberId", member.id);
                  run(removeMember, data);
                }}
                className="btn btn-primary"
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="btn">
                Keep {member.name}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="label hover:text-term-fg"
          >
            [ Remove from club ]
          </button>
        )}
      </div>
    </form>
  );
}
