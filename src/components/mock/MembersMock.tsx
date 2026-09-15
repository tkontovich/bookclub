"use client";

// MOCK ONLY - members table with an edit view. Adding, editing and removing
// only change the fake state in mockState.ts, never the database.
import { useState } from "react";
import type { Member } from "@/lib/types";
import { Modal } from "../Modal";
import { emailFor, setMock, useMock } from "./mockState";

type Row = { id: string; name: string; active: boolean };

export function MembersMock({ members }: { members: Member[] }) {
  const mock = useMock();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const activeIds = members.filter((m) => m.active).map((m) => m.id);
  const rows: Row[] = [
    ...members.map((m) => ({
      id: m.id,
      name: mock.names[m.id] ?? m.name,
      active: m.active && !mock.removedIds.includes(m.id),
    })),
    ...mock.added.map((a) => ({
      id: a.id,
      name: mock.names[a.id] ?? a.name,
      active: !mock.removedIds.includes(a.id),
    })),
  ];
  const emailOf = (row: Row) => emailFor(mock, row, activeIds);
  const editing = rows.find((r) => r.id === editingId) ?? null;

  return (
    <div className="space-y-3">
      <div className="border border-term-fg/25">
        <div className="label hidden gap-4 border-b border-term-fg/25 px-3 py-2 sm:flex">
          <span className="w-36 shrink-0">Name</span>
          <span className="flex-1">Email</span>
        </div>
        <ul className="divide-y divide-term-fg/15">
          {rows.map((row) => {
            const email = emailOf(row);
            return (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
                  <span
                    className={
                      row.active
                        ? "block truncate text-sm uppercase tracking-wider text-term-bright sm:w-36 sm:shrink-0"
                        : "block truncate text-sm uppercase tracking-wider text-term-dim line-through sm:w-36 sm:shrink-0"
                    }
                  >
                    {row.name}
                  </span>
                  {row.active && (
                    <span className="block truncate text-xs text-term-fg sm:text-sm">
                      {email || <span className="text-term-dim">No email</span>}
                    </span>
                  )}
                </div>
                {row.active ? (
                  <button
                    type="button"
                    onClick={() => setEditingId(row.id)}
                    className="label shrink-0 hover:text-term-fg"
                  >
                    [ Edit ]
                  </button>
                ) : (
                  <span className="label shrink-0">Removed</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-term-dim">
        Emails are only used for calendar invites, and are left out of the public backups.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name) return;
          const id = `mock-${Date.now()}`;
          setMock({
            added: [...mock.added, { id, name }],
            emails: { ...mock.emails, [id]: newEmail.trim() },
          });
          setNewName("");
          setNewEmail("");
        }}
        className="flex flex-wrap items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="FIRST NAME"
          required
          className="min-w-32 flex-1"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="EMAIL"
          className="min-w-48 flex-[2]"
        />
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>

      <Modal open={editing !== null} onClose={() => setEditingId(null)} title="Edit member">
        {editing && (
          <MemberEditForm
            key={editing.id}
            row={editing}
            email={emailOf(editing)}
            onDone={() => setEditingId(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MemberEditForm({
  row,
  email,
  onDone,
}: {
  row: Row;
  email: string;
  onDone: () => void;
}) {
  const mock = useMock();
  const [name, setName] = useState(row.name);
  const [emailValue, setEmailValue] = useState(email);
  const [confirming, setConfirming] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMock({
          names: { ...mock.names, [row.id]: name.trim() },
          emails: { ...mock.emails, [row.id]: emailValue.trim() },
        });
        onDone();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label htmlFor="memberName" className="label block">
          First name
        </label>
        <input
          id="memberName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          placeholder="FOR CALENDAR INVITES"
          className="w-full"
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">
          Save changes
        </button>
        <button type="button" onClick={onDone} className="btn">
          Cancel
        </button>
      </div>

      <div className="space-y-2 border-t border-term-fg/25 pt-4">
        {confirming ? (
          <div className="space-y-3 border border-term-fg/40 bg-term-fg/10 p-3">
            <p className="text-xs uppercase tracking-widest text-term-bright">
              Remove {row.name} from the club?
            </p>
            <p className="text-xs text-term-dim">
              Their past scores stay. They drop off score entry and future invites.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMock({ removedIds: [...mock.removedIds, row.id] });
                  onDone();
                }}
                className="btn btn-primary"
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="btn">
                Keep {row.name}
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
