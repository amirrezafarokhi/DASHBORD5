export enum PricingModelKey {
  CUSTOM = 'CUSTOM',
  BRIGHT = 'BRIGHT',
  ECO = 'ECO',
  SIMPLE = 'SIMPLE'
}

export interface LightType {
  id: string;
  name: string;
}

// --- Form Data Structures ---

export interface SpecsFormData {
  dimensions: string;
  inset_cut_dimensions: string;
  row_in_liner: string;
  body_material: string;
  main_usage: string;
  installation_type: string;
  installation_method: string;
  notes: string;
  ertafa_saqf: string;
  code_liner: string;
}

export interface PricingFormData {
  model_name: string;
  price_per_meter: number;
  warranty_months: number;
  light: string; 
  light_source_persion: string;
  light_source: string;
  density: string;
  three_color: string; // Mapped to "3Color"
  rgb: string; // Mapped to "RGB"
  model_key: PricingModelKey;
  ip65: string; // "true"/"false"
  ip20: string; // "true"/"false"
  tage: string;
  spase_recommend: string;
  dimer: string;
  pricing_code_liner: string;
  suitable_for: string;
  longevity: string;
  lumen: number;
  w_per_meter: string;
  power_source: string;
  row_in_liner: string;
}

export interface FAQFormData {
  question: string;
  answer: string;
  code_liner: string;
}

export interface ProductFormData {
  // Step 1: Product Info
  name: string;
  code_liner: string;
  category: string;
  short_description: string;
  no_pricing: string;
  
  is_active: string; // "true"/"false"
  Custom_design: string;
  active_body_color: string;
  active_light_type: string;

  image_url: string;
  image_black_url: string;
  image_white_url: string;
  Pdf_url: string;

  // Step 2: Specs
  specs: SpecsFormData;
  
  // Step 3: Gallery (Handled via local state 'galleryFiles')

  // Step 4: Pricing
  pricing: PricingFormData[];
  
  // Step 5: Body Colors
  body_colors: {
    name: string;
    key: "white_glossy" | "black_matte";
    initial_stock: number;
  }[];
  
  // Step 6: FAQs
  faqs: FAQFormData[];
  faq_sales: FAQFormData[];
  
  // Step 7: Light Types (values: natural, warm, cool, rgb, tri)
  light_type_values: string[];
}

// --- Database Row Interfaces ---

export interface DbProduct {
  id: string;
  name: string;
  code_liner: string;
  category: string;
  short_description: string;
  no_pricing: string;
  is_active: boolean;
  Custom_design: boolean;
  active_body_color: boolean;
  active_light_type: boolean;
  image_url: string;
  image_black_url: string;
  image_white_url: string;
  Pdf_url: string;
  updated_at?: string;
  created_at?: string;
}

export interface DbSpecs extends SpecsFormData {
  id: string;
  product_id: string;
}

export interface DbProductGallery {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface DbPricing {
  id: string;
  product_id: string;
  model_name: string;
  price_per_meter: number;
  warranty_months: number;
  light: string;
  light_source_persion: string;
  light_source: string;
  density: string;
  "3Color": string; // DB Column
  RGB: string; // DB Column
  model_key: string;
  IP65: boolean; // DB Column UPPERCASE
  IP20: boolean; // DB Column UPPERCASE
  tage: string;
  spase_recommend: string;
  dimer: string;
  pricing_code_liner: string;
  suitable_for: string;
  longevity: string;
  lumen: number;
  w_per_meter: string;
  power_source: string;
  row_in_liner: string;
}

export interface DbBodyColor {
  id: string;
  product_id: string;
  name: string;
  key: string;
  initial_stock: number;
}

export interface DbFAQ {
  id: string;
  product_id: string;
  question: string;
  answer: string;
  sort: number;
  code_liner: string;
}

export interface DbProductInventory {
  product_id: string;
  pricing_id: string;
  body_color_id: string;
  light_type_id: string;
  stock_qty: number;
  
  status: string;
  status_pricing_model: string;
  status_body_color: string;
  status_light_type: string;
  
  code_liner: string;
  model_name: string;
  body_Color: string;
  light_type: string;
}