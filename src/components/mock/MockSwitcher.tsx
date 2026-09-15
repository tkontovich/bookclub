"use client";

// MOCK ONLY - floating panel for flipping between the fake calendar states.
import { resetMock, setMock, useMock, type InviteStatus } from "./mockState";

const INVITE_STATES: { value: InviteStatus; label: string }[] = [
  { value: "none", label: "Not sent" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

export function MockSwitcher() {
  const mock = useMock();

  return (
    <details
      open
      className="disclosure fixed bottom-4 right-4 z-[102] w-72 border border-term-green/60 bg-[#100a03] shadow-[0_0_30px_rgba(92,230,138,0.15)]"
    >
      <summary className="label px-3 py-2 text-term-green">Mock states</summary>
      <div className="space-y-3 border-t border-term-green/30 p-3">
        <label className="label flex items-center gap-2 hover:text-term-fg">
          <input
            type="checkbox"
            checked={mock.connected}
            onChange={(e) => setMock({ connected: e.target.checked })}
          />
          Google connected
        </label>
        <div className="space-y-1.5">
          <span className="label block">Current invite</span>
          <div className="flex gap-1">
            {INVITE_STATES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setMock({ invite: s.value })}
                className={
                  mock.invite === s.value
                    ? "btn btn-primary whitespace-nowrap px-2"
                    : "btn whitespace-nowrap px-2"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={resetMock} className="label underline hover:text-term-fg">
          Reset mock
        </button>
      </div>
    </details>
  );
}
