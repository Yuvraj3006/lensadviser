'use client';

export default function TestDebugPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Test Debug Page</h1>
      <p>If you can see this, the basic rendering is working.</p>
      <p className="mt-4 text-sm text-gray-600">
        Timestamp: {new Date().toISOString()}
      </p>
    </div>
  );
}
