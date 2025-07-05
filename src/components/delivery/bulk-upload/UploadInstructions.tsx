
import React from 'react';

export const UploadInstructions: React.FC = () => {
  return (
    <div className="text-sm text-gray-600">
      <p>Upload a CSV or Excel file with columns:</p>
      <ul className="list-disc list-inside mt-2">
        <li>Name (required)</li>
        <li>Phone (required)</li>
        <li>Address (optional)</li>
      </ul>
      <p className="mt-2 text-xs">Supports both tab-separated and comma-separated values.</p>
    </div>
  );
};
