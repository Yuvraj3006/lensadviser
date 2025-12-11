'use client';

export default function TestDebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Debug Page</h1>
      <p>If you can see this, the basic rendering is working.</p>
      <p className="mt-4 text-sm text-gray-600">
        Timestamp: {new Date().toISOString()}
      </p>
    </div>
  );
}
