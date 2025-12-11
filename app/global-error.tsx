'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error details for debugging
  console.error('Global Error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    digest: error.digest,
  });

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
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 rounded-md bg-red-50 p-4 text-left">
                <p className="mb-2 text-sm font-semibold text-red-800">
                  Error Details (Development):
                </p>
                <pre className="max-h-40 overflow-auto text-xs text-red-700">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </div>
            )}
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

