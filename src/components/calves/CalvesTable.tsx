
import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Image, Trash2, Eye } from 'lucide-react';

interface Calf {
  id: string;
  calf_number?: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  mother_cow_id?: string;
  breed?: string;
  birth_weight?: number;
  status?: 'alive' | 'dead' | 'sold';
  image_url?: string;
  notes?: string;
}

interface CalvesTableProps {
  calves: any[];
  onEdit: (calf: any) => void;
  onView: (calf: any) => void;
  onDelete: (id: string) => void;
}

export const CalvesTable: React.FC<CalvesTableProps> = ({
  calves,
  onEdit,
  onView,
  onDelete
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'dead': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months`;
    } else {
      return `${Math.floor(diffDays / 365)} years`;
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Calf Number</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Mother</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calves?.map((calf: any) => (
            <TableRow key={calf.id}>
              <TableCell>
                {calf.image_url ? (
                  <img 
                    src={calf.image_url} 
                    alt={`Calf ${calf.calf_number}`}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{calf.calf_number || 'N/A'}</TableCell>
              <TableCell className="capitalize">{calf.gender}</TableCell>
              <TableCell>{calculateAge(calf.date_of_birth)}</TableCell>
              <TableCell>{calf.cows?.cow_number || 'Unknown'}</TableCell>
              <TableCell>{calf.birth_weight ? `${calf.birth_weight} kg` : 'N/A'}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(calf.status || 'alive')}>
                  {calf.status || 'alive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(calf)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(calf)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this calf?')) {
                        onDelete(calf.id);
                      }
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
