export const Counter = ({ start = 0, label = "Clicks" }) => {
  const [count, setCount] = useState(start);
  return (
    <div className="not-prose my-6 flex items-center gap-3 rounded-xl border border-zinc-950/10 p-4 dark:border-white/10">
      <button
        type="button"
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        onClick={() => setCount(count + 1)}
      >
        {label}: <span data-testid="count">{count}</span>
      </button>
    </div>
  );
};

export const Greeting = ({ name }) => <p className="text-lg">Hello, {name}!</p>;
