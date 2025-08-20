import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Image } from 'lucide-react';

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

interface CalfDetailsDialogProps {
  calves: Calf[];
  isOpen: boolean;
  onClose: () => void;
  cowNumber: string;
}

export const CalfDetailsDialog: React.FC<CalfDetailsDialogProps> = ({
  calves,
  isOpen,
  onClose,
  cowNumber
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calves for Cow {cowNumber}</DialogTitle>
        </DialogHeader>
        
        {calves.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No calves found for this cow.
          </div>
        ) : (
          <div className="grid gap-4">
            {calves.map((calf) => (
              <div key={calf.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {calf.image_url ? (
                      <img 
                        src={calf.image_url} 
                        alt={`Calf ${calf.calf_number}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Image className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {calf.calf_number || 'Unnamed Calf'}
                        </h3>
                        <div className="space-y-2 mt-2">
                          <div>
                            <span className="text-sm text-gray-600">Gender:</span>
                            <span className="ml-2 capitalize">{calf.gender}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Age:</span>
                            <span className="ml-2">{calculateAge(calf.date_of_birth)}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Date of Birth:</span>
                            <span className="ml-2">{new Date(calf.date_of_birth).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="space-y-2">
                          {calf.breed && (
                            <div>
                              <span className="text-sm text-gray-600">Breed:</span>
                              <span className="ml-2">{calf.breed}</span>
                            </div>
                          )}
                          {calf.birth_weight && (
                            <div>
                              <span className="text-sm text-gray-600">Birth Weight:</span>
                              <span className="ml-2">{calf.birth_weight} kg</span>
                            </div>
                          )}
                          <div>
                            <span className="text-sm text-gray-600">Status:</span>
                            <Badge className={`ml-2 ${getStatusColor(calf.status || 'alive')}`}>
                              {calf.status || 'alive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {calf.notes && (
                      <div className="mt-4">
                        <span className="text-sm text-gray-600">Notes:</span>
                        <p className="mt-1 text-sm">{calf.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};