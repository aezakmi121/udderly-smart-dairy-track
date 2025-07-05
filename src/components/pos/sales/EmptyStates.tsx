
import React from 'react';
import { Package, Search } from 'lucide-react';

export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <Package className="h-8 w-8 mx-auto mb-2 animate-pulse" />
      <p>Loading products...</p>
    </div>
  </div>
);

export const NoProductsState: React.FC = () => (
  <div className="text-center py-8 text-muted-foreground">
    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p>No products available.</p>
    <p className="text-sm">Please add products first.</p>
  </div>
);

export const NoSearchResultsState: React.FC = () => (
  <div className="text-center py-8 text-muted-foreground">
    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p>No products found matching your search.</p>
  </div>
);
