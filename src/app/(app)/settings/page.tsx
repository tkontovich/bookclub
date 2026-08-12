import { addMember, removeMember, updateNextMeetingDate, updateNextPicker } from "@/lib/actions";
import { getActiveMembers, getAllMembers, getClubSettings } from "@/lib/data";

export default async function SettingsPage() {
  const [allMembers, activeMembers, settings] = await Promise.all([
    getAllMembers(),
    getActiveMembers(),
    getClubSettings(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Next meeting</h2>
        <form action={updateNextMeetingDate} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            name="nextMeetingDate"
            defaultValue={settings.next_meeting_date ?? ""}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Save
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Next picker</h2>
        <p className="text-sm text-neutral-500">
          Whoever picks next meeting gets to propose two books on the Vote page.
        </p>
        <form action={updateNextPicker} className="flex flex-wrap items-center gap-2">
          <select
            name="nextPickerId"
            defaultValue={settings.next_picker_id ?? ""}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Nobody set</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Save
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Members</h2>
        <ul className="space-y-1">
          {allMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span className={m.active ? "" : "text-neutral-400 line-through"}>{m.name}</span>
              {m.active && (
                <form action={removeMember}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <button type="submit" className="text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200">
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addMember} className="flex flex-wrap items-center gap-2 pt-2">
          <input
            type="text"
            name="name"
            placeholder="New member name"
            required
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
