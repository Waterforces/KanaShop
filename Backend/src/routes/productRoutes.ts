import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ProductRepo } from '../repositories/productRepo.js';
import { ProductCategory, ProductSubcategory } from '../types/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { uploadProduct, verifyUploadMagicBytes } from '../middleware/upload.js';

export const productRouter = Router();

/**
 * Public: Get products with live search & taxonomy filter
 */
productRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, subcategory } = req.query;

    const products = await ProductRepo.filter({
      search: typeof q === 'string' ? q : undefined,
      category: typeof category === 'string' ? (category as ProductCategory) : 'all',
      subcategory:
        typeof subcategory === 'string'
          ? (subcategory as ProductSubcategory)
          : 'all',
    });

    res.json(products);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

/**
 * Public: Hero section "Popular Sales This Week"
 */
productRouter.get('/popular', async (_req: Request, res: Response): Promise<void> => {
  try {
    const popular = await ProductRepo.getPopularSales(3);
    res.json(popular);
  } catch (err: any) {
    console.error('Error fetching popular products:', err);
    res.status(500).json({ error: 'Failed to fetch popular products.' });
  }
});

/**
 * Public: Single product detail
 */
productRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await ProductRepo.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

/**
 * Admin: Create Product
 */
productRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  uploadProduct.array('images', 5),
  verifyUploadMagicBytes,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        category,
        subcategory,
        capacityOz,
        price,
        stock,
      } = req.body;

      if (!title || !category || !subcategory || !price) {
        res.status(400).json({ error: 'Title, category, subcategory, and price are required.' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      const uploadedImages = files && files.length > 0
        ? files.map((f) => `/uploads/products/${f.filename}`)
        : [];

      if (uploadedImages.length === 0) {
        res.status(400).json({ error: 'Please upload at least one image file.' });
        return;
      }

      const images = uploadedImages;

      const newProduct = await ProductRepo.create({
        id: `prd_${uuidv4().replace(/-/g, '').slice(0, 10)}`,
        title: title.trim(),
        description: description || '',
        category,
        subcategory,
        capacityOz: parseInt(capacityOz || '30', 10),
        price: parseFloat(price),
        stock: parseInt(stock || '50', 10),
        salesVolume: 0,
        images,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      res.status(201).json(newProduct);
    } catch (err: any) {
      console.error('Error creating product:', err);
      res.status(500).json({ error: 'Failed to create product.' });
    }
  }
);

/**
 * Admin: Update Product
 */
productRouter.put(
  '/:id',
  requireAuth,
  requireAdmin,
  uploadProduct.array('images', 5),
  verifyUploadMagicBytes,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const allowedKeys = ['title', 'description', 'category', 'subcategory', 'capacityOz', 'price', 'stock', 'active'];
      const updates: any = {};
      for (const key of allowedKeys) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      if (updates.price !== undefined) updates.price = Math.max(0, parseFloat(String(updates.price)));
      if (updates.stock !== undefined) updates.stock = Math.max(0, parseInt(String(updates.stock), 10));
      if (updates.capacityOz !== undefined) updates.capacityOz = Math.max(1, parseInt(String(updates.capacityOz), 10));
      if (updates.active !== undefined) updates.active = updates.active === true || updates.active === 'true';

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const newImages = files.map((f) => `/uploads/products/${f.filename}`);
        updates.images = newImages;
      }

      const updated = await ProductRepo.update(id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      res.json(updated);
    } catch (err: any) {
      console.error('Error updating product:', err);
      res.status(500).json({ error: 'Failed to update product.' });
    }
  }
);

/**
 * Admin: Delete Product
 */
productRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await ProductRepo.delete(req.params.id);
      if (!success) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ success: true, message: 'Product deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete product.' });
    }
  }
);
