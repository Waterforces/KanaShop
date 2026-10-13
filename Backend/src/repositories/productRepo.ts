import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../storage/jsonStore.js';
import { Product, ProductCategory, ProductSubcategory } from '../types/index.js';

interface ProductsFileSchema {
  products: Product[];
}

export class ProductRepo {
  private static getFilePath(): string {
    return path.join(ENV.DATA_DIR, 'products.json');
  }

  private static fallback: ProductsFileSchema = {
    products: [],
  };

  static async getAll(includeInactive = false): Promise<Product[]> {
    const data = await JsonStore.read<ProductsFileSchema>(this.getFilePath(), this.fallback);
    if (includeInactive) return data.products;
    return data.products.filter((p) => p.active);
  }

  static async findById(id: string): Promise<Product | null> {
    const products = await this.getAll(true);
    return products.find((p) => p.id === id) || null;
  }

  static async filter(params: {
    search?: string;
    category?: ProductCategory | 'all';
    subcategory?: ProductSubcategory | 'all';
  }): Promise<Product[]> {
    let products = await this.getAll(false);

    if (params.category && params.category !== 'all') {
      products = products.filter((p) => p.category === params.category);
    }

    if (params.subcategory && params.subcategory !== 'all') {
      products = products.filter((p) => p.subcategory === params.subcategory);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return products;
  }

  static async getPopularSales(limit = 3): Promise<Product[]> {
    const products = await this.getAll(false);
    return [...products]
      .sort((a, b) => b.salesVolume - a.salesVolume)
      .slice(0, limit);
  }

  static async create(product: Product): Promise<Product> {
    await JsonStore.update<ProductsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        current.products.push(product);
        return current;
      }
    );
    return product;
  }

  static async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    let updatedProduct: Product | null = null;
    await JsonStore.update<ProductsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const index = current.products.findIndex((p) => p.id === id);
        if (index !== -1) {
          current.products[index] = {
            ...current.products[index],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          updatedProduct = current.products[index];
        }
        return current;
      }
    );
    return updatedProduct;
  }

  static async delete(id: string): Promise<boolean> {
    let deleted = false;
    await JsonStore.update<ProductsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        const initial = current.products.length;
        current.products = current.products.filter((p) => p.id !== id);
        deleted = current.products.length < initial;
        return current;
      }
    );
    return deleted;
  }

  /**
   * Atomic check-and-deduct stock within the storage mutex lock.
   * If ANY item has insufficient stock or is inactive, fails atomically without deductions.
   */
  static async checkAndDeductStock(
    items: { productId: string; qty: number }[]
  ): Promise<{ success: boolean; error?: string; updatedProducts?: Product[] }> {
    let failureReason: string | null = null;
    let modifiedProducts: Product[] = [];

    await JsonStore.update<ProductsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        // Step 1: Pre-validation of ALL items under lock
        for (const item of items) {
          const product = current.products.find((p) => p.id === item.productId);
          if (!product) {
            failureReason = `Product with ID ${item.productId} was not found.`;
            return current;
          }
          if (!product.active) {
            failureReason = `Product "${product.title}" is currently unavailable.`;
            return current;
          }
          if (product.stock < item.qty) {
            failureReason = `Insufficient stock for "${product.title}". Requested: ${item.qty}, Available: ${product.stock}.`;
            return current;
          }
        }

        // Step 2: Atomic deduction once all validations pass
        for (const item of items) {
          const product = current.products.find((p) => p.id === item.productId)!;
          product.salesVolume += item.qty;
          product.stock -= item.qty;
          product.updatedAt = new Date().toISOString();
          modifiedProducts.push({ ...product });
        }

        return current;
      }
    );

    if (failureReason) {
      return { success: false, error: failureReason };
    }
    return { success: true, updatedProducts: modifiedProducts };
  }

  static async recordSales(items: { productId: string; qty: number }[]): Promise<void> {
    await JsonStore.update<ProductsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        for (const item of items) {
          const product = current.products.find((p) => p.id === item.productId);
          if (product) {
            product.salesVolume += item.qty;
            product.stock = Math.max(0, product.stock - item.qty);
            product.updatedAt = new Date().toISOString();
          }
        }
        return current;
      }
    );
  }

  static async restoreStock(items: { productId: string; qty: number }[]): Promise<void> {
    await JsonStore.update<ProductsFileSchema>(
      this.getFilePath(),
      this.fallback,
      (current) => {
        for (const item of items) {
          const product = current.products.find((p) => p.id === item.productId);
          if (product) {
            product.salesVolume = Math.max(0, product.salesVolume - item.qty);
            product.stock += item.qty;
            product.updatedAt = new Date().toISOString();
          }
        }
        return current;
      }
    );
  }
}

