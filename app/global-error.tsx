'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
            <h1 className="mb-4 text-2xl font-bold text-slate-900">
              Application Error
            </h1>
            <p className="mb-6 text-slate-600">
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

