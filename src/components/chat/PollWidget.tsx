"use client";

import useSWR from "swr";

interface PollData {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  totalVotes: number;
  userVote: number | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PollWidget({ pollId }: { pollId: string }) {
  const { data: poll, mutate } = useSWR<PollData>(
    `/api/polls/${pollId}`,
    fetcher
  );

  if (!poll || poll.question === undefined) {
    return (
      <div className="my-2 animate-pulse rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  const hasVoted = poll.userVote !== null;

  async function vote(optionIndex: number) {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionIndex }),
    });
    if (res.ok) {
      mutate();
    }
  }

  return (
    <div className="my-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-semibold">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((option, i) => {
          const count = poll.votes[i] ?? 0;
          const pct = poll.totalVotes > 0 ? (count / poll.totalVotes) * 100 : 0;
          const isSelected = poll.userVote === i;

          if (hasVoted) {
            return (
              <div key={i} className="relative overflow-hidden rounded-md">
                <div
                  className="absolute inset-0 rounded-md bg-purple-100 dark:bg-purple-900/30"
                  style={{ width: `${pct}%` }}
                />
                <div
                  className={`relative flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                    isSelected
                      ? "border-purple-400 font-medium dark:border-purple-600"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <span>
                    {isSelected && <span className="mr-1.5 text-purple-500">&#10003;</span>}
                    {option}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {count} ({Math.round(pct)}%)
                  </span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={i}
              onClick={() => vote(i)}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-zinc-700 dark:hover:border-purple-600 dark:hover:bg-purple-900/20"
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
        {hasVoted && " · tap another option to change your vote"}
      </p>
    </div>
  );
}
