"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-shell">
      <section className="panel error-panel">
        <span className="eyebrow">Application error</span>
        <h1>Something went wrong</h1>
        <p>{error.message || "FlowForge could not render this page."}</p>
        <button className="primary-action" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
