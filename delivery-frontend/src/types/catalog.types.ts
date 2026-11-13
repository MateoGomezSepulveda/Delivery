export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  image?: string;
  categoryId: string | Category;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductSortBy = 'price' | 'createdAt' | 'name';
export type SortOrder = 'asc' | 'desc';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
}

export interface ReviewUserPopulated {
  _id: string;
  name: string;
}

export interface Review {
  _id: string;
  user: ReviewUserPopulated | string;
  product: string;
  order: string;
  rating: number;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  available?: boolean;
  image?: string;
  categoryId: string;
}

export interface CreateReviewPayload {
  product: string;
  order: string;
  rating: number;
  comment?: string;
}
