
export interface CustomerUploadData {
  name: string;
  phone: string;
  address: string;
}

export interface BulkUploadProps {
  onUploadComplete: () => void;
}
