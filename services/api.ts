import { supabase } from '../lib/supabaseClient';
import { DbProduct, DbPricing, DbBodyColor, DbProductInventory, LightType, DbSpecs, DbProductGallery, DbFAQ } from '../types';

export const api = {
  getLightTypes: async (): Promise<LightType[]> => {
    const { data, error } = await supabase.from('light_types').select('id, name');
    if (error) { console.error('Error fetching light types:', error); return []; }
    return data || [];
  },

  getAllProducts: async (): Promise<DbProduct[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false }); // Sort by recently updated
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  getProductFull: async (productId: string) => {
    // Parallel fetch for Edit Mode
    const [
      productRes, 
      specsRes, 
      pricingRes, 
      colorsRes, 
      galleryRes, 
      faqRes, 
      faqSalesRes
    ] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase.from('specs').select('*').eq('product_id', productId).maybeSingle(),
      supabase.from('Pricing').select('*').eq('product_id', productId),
      supabase.from('body_colors').select('*').eq('product_id', productId),
      supabase.from('ProductGallery').select('*').eq('product_id', productId).order('sort_order'),
      supabase.from('FAQ').select('*').eq('product_id', productId).order('sort'),
      supabase.from('FAQsales').select('*').eq('product_id', productId).order('sort')
    ]);

    if (productRes.error) throw new Error(productRes.error.message);

    return {
      product: productRes.data,
      specs: specsRes.data,
      pricing: pricingRes.data || [],
      body_colors: colorsRes.data || [],
      gallery: galleryRes.data || [],
      faqs: faqRes.data || [],
      faq_sales: faqSalesRes.data || []
    };
  },

  uploadFile: async (file: File, codeLiner: string, bucket: string = 'prosduct'): Promise<string> => {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${codeLiner}/${Date.now()}_${sanitizedName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  // --- PARENT OPERATIONS ---
  createProduct: async (data: Omit<DbProduct, 'id'>): Promise<DbProduct> => {
    const { data: product, error } = await supabase.from('products').insert(data).select().single();
    if (error) throw new Error(error.message);
    return product;
  },

  updateProduct: async (id: string, data: Partial<DbProduct>): Promise<DbProduct> => {
    const { data: product, error } = await supabase.from('products').update(data).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return product;
  },

  deleteProduct: async (id: string, hard: boolean = false) => {
    if (hard) {
      // Hard delete: Manually clean children first (safe approach)
      await api.deleteProductChildren(id); 
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      // Soft delete
      const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  // --- CHILD OPERATIONS (Edit Strategy: Nuke & Rebuild) ---
  deleteProductChildren: async (productId: string) => {
    await Promise.all([
      supabase.from('specs').delete().eq('product_id', productId),
      supabase.from('Pricing').delete().eq('product_id', productId),
      supabase.from('body_colors').delete().eq('product_id', productId),
      supabase.from('ProductGallery').delete().eq('product_id', productId),
      supabase.from('FAQ').delete().eq('product_id', productId),
      supabase.from('FAQsales').delete().eq('product_id', productId),
      supabase.from('product_inventory').delete().eq('product_id', productId)
    ]);
  },

  // --- BATCH INSERTS ---
  createSpecs: async (data: Omit<DbSpecs, 'id'>) => {
    const { error } = await supabase.from('specs').insert(data);
    if (error) throw new Error(error.message);
  },
  createProductGalleryBatch: async (items: Omit<DbProductGallery, 'id'>[]) => {
    if (items.length === 0) return;
    const { error } = await supabase.from('ProductGallery').insert(items);
    if (error) throw new Error(error.message);
  },
  createPricingBatch: async (items: Omit<DbPricing, 'id'>[]): Promise<DbPricing[]> => {
    const { data, error } = await supabase.from('Pricing').insert(items).select();
    if (error) throw new Error(error.message);
    return data || [];
  },
  createBodyColorsBatch: async (items: Omit<DbBodyColor, 'id'>[]): Promise<DbBodyColor[]> => {
    const { data, error } = await supabase.from('body_colors').insert(items).select();
    if (error) throw new Error(error.message);
    return data || [];
  },
  createFAQBatch: async (items: Omit<DbFAQ, 'id'>[]) => {
    if (items.length === 0) return;
    const { error } = await supabase.from('FAQ').insert(items);
    if (error) throw new Error(error.message);
  },
  createFAQSalesBatch: async (items: Omit<DbFAQ, 'id'>[]) => {
    if (items.length === 0) return;
    const { error } = await supabase.from('FAQsales').insert(items);
    if (error) throw new Error(error.message);
  },
  createInventoryBatch: async (items: DbProductInventory[]) => {
    if (items.length === 0) return;
    const { error } = await supabase.from('product_inventory').insert(items);
    if (error) throw new Error(error.message);
  }
};