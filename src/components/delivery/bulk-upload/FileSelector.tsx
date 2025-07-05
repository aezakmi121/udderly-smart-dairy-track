
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, X } from 'lucide-react';

interface FileSelectorProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  isDisabled: boolean;
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  file,
  onFileChange,
  isDisabled
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    onFileChange(selectedFile || null);
  };

  const removeFile = () => {
    onFileChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>Select File</Label>
      <div className="flex flex-col gap-2">
        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileChange}
          disabled={isDisabled}
          className="hidden"
          id="file-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isDisabled}
          className="w-full"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Choose File
        </Button>
        
        {file && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-gray-500" />
              <span className="truncate">{file.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={isDisabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
