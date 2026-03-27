"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";

interface Member {
  id: string;
  name: string | null;
  email: string;
}

interface MemberSelectProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MemberSelect({ selected, onChange }: MemberSelectProps) {
  const { data: session } = useSession();
  const { data: members } = useSWR<Member[]>("/api/members", fetcher);

  const filteredMembers = (members ?? []).filter(
    (m) => m.id !== session?.user?.id
  );

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (!filteredMembers.length) {
    return (
      <p className="text-sm text-zinc-500">No other team members available</p>
    );
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto">
      {filteredMembers.map((m) => (
        <label
          key={m.id}
          className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <input
            type="checkbox"
            checked={selected.includes(m.id)}
            onChange={() => toggle(m.id)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <div>
            <p className="text-sm">{m.name ?? m.email}</p>
            {m.name && (
              <p className="text-xs text-zinc-500">{m.email}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
