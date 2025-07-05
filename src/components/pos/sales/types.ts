
export interface SaleItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  discount?: number;
  total: number;
  fractionalAllowed: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
}
