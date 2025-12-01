import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  UploadCloud,
  FileText,
  X,
  Sparkles,
  Search,
  Lightbulb,
  Image as ImageIcon,
  HelpCircle,
  PackageCheck,
  Check
} from 'lucide-react';

import { 
  Button, 
  Input, 
  Label, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter, 
  NativeSelect, 
  Textarea,
  cn 
} from './ui/Primitives';
import { api } from '../services/api';
import { PricingModelKey, LightType, DbProductInventory } from '../types';
import { supabase } from '../lib/supabaseClient';
import LoginScreen from './auth/LoginScreen';

// --- CONFIGURATION ---
const ADMIN_PHONE = "09308421425"; 
const ADMIN_PASSWORD = "amirreza1384"; 
const BUCKET_NAME = 'prosduct';

// --- UTILS ---

const GENERATE_LINER_CODES = () => {
  const codes: string[] = [];
  for(let i = 1; i <= 90; i++) codes.push(`131 - ${i}`);
  for(let i = 1; i <= 90; i++) codes.push(`132 - ${i}`);
  return codes;
};

// Map selected keys to specific Persian Labels for Inventory
const LIGHT_TYPE_INVENTORY_LABEL: Record<string, string> = {
  natural: 'نچرال',
  warm: 'آفتابی',
  cool: 'سفید',
  rgb: 'RGB (مولتی کالر)',
  tri: '3 حالته (نچرال ، سفید ، آفتابی)'
};

const findLightTypeId = (lightTypes: LightType[], key: string): string => {
  const lowerKey = key.toLowerCase();
  const match = lightTypes.find(lt => {
    const name = lt.name.toLowerCase();
    if (lowerKey === 'natural' && name.includes('natural')) return true;
    if (lowerKey === 'warm' && name.includes('warm')) return true;
    if (lowerKey === 'cool' && (name.includes('cool') || name.includes('white'))) return true;
    if (lowerKey === 'rgb' && name.includes('rgb')) return true;
    if (lowerKey === 'tri' && (name.includes('tri') || name.includes('3'))) return true;
    return false;
  });
  return match?.id || 'unknown_id';
};

// --- ZOD SCHEMAS ---

const specsSchema = z.object({
  dimensions: z.string().optional(),
  inset_cut_dimensions: z.string().optional(),
  row_in_liner: z.string().optional(),
  body_material: z.string().optional(),
  main_usage: z.string().optional(),
  installation_type: z.string().optional(),
  installation_method: z.string().optional(),
  notes: z.string().optional(),
  ertafa_saqf: z.string().optional(),
  code_liner: z.string().min(1, "کد لاینر (مشخصات) الزامی است"),
});

const pricingSchema = z.object({
  model_name: z.string().min(1, "نام مدل الزامی است"),
  price_per_meter: z.number().min(0),
  warranty_months: z.number().min(0),
  light: z.string(), 
  light_source_persion: z.string(),
  light_source: z.string(),
  density: z.string(),
  three_color: z.string(),
  rgb: z.string(),
  model_key: z.nativeEnum(PricingModelKey),
  ip65: z.enum(["true", "false"]),
  ip20: z.enum(["true", "false"]),
  tage: z.string().optional(),
  spase_recommend: z.string().optional(),
  dimer: z.string().optional(),
  pricing_code_liner: z.string().min(1, "کد لاینر (قیمت) الزامی است"),
  suitable_for: z.string().optional(),
  longevity: z.string().optional(),
  lumen: z.number().optional(),
  w_per_meter: z.string().optional(),
  power_source: z.string().optional(),
  row_in_liner: z.string().optional()
});

const faqSchema = z.object({
  question: z.string().min(1, "سوال الزامی است"),
  answer: z.string().min(1, "جواب الزامی است"),
  code_liner: z.string().min(1, "کد لاینر الزامی است"),
});

const bodyColorSchema = z.object({
  name: z.string().min(1, "نام رنگ الزامی است"),
  key: z.enum(["white_glossy", "black_matte"]),
  initial_stock: z.number().min(0),
});

const productWizardSchema = z.object({
  // Step 1
  name: z.string().min(3, "نام محصول باید حداقل ۳ کاراکتر باشد"),
  code_liner: z.string().min(1, "کد لاینر اصلی الزامی است"),
  category: z.string().min(1, "دسته‌بندی الزامی است"),
  short_description: z.string().optional(),
  no_pricing: z.string().optional(),
  is_active: z.enum(["true", "false"]),
  Custom_design: z.enum(["true", "false"]),
  active_body_color: z.enum(["true", "false"]),
  active_light_type: z.enum(["true", "false"]),
  
  specs: specsSchema,
  pricing: z.array(pricingSchema).min(1, "حداقل یک مدل قیمت‌گذاری لازم است"),
  body_colors: z.array(bodyColorSchema).min(1, "حداقل یک رنگ بدنه لازم است"),
  faqs: z.array(faqSchema),
  faq_sales: z.array(faqSchema),
  light_type_values: z.array(z.string()).min(1, "حداقل یک نوع نور باید انتخاب شود"),
});

type FormData = z.infer<typeof productWizardSchema>;

// --- HELPER COMPONENTS ---

const FileUploadZone = ({ 
  label, 
  accept, 
  onFileSelect,
  currentFile,
  onRemove
}: { 
  label: string, 
  accept: Record<string, string[]>, 
  onFileSelect: (f: File) => void,
  currentFile: File | null,
  onRemove: () => void
}) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFile) {
      setPreview(null);
      return;
    }
    if (currentFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(currentFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [currentFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.[0]) onFileSelect(acceptedFiles[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles: 1 });

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-700 font-bold">{label}</Label>
      {!currentFile ? (
        <div 
          {...getRootProps()} 
          className={cn("border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors", isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}
        >
          <input {...getInputProps()} />
          <UploadCloud className={cn("mb-2", isDragActive ? "text-blue-500" : "text-slate-400")} size={24} />
          <span className="text-[10px] text-slate-500 text-center px-2">{isDragActive ? "رها کنید..." : "انتخاب فایل"}</span>
        </div>
      ) : (
        <div className="relative border border-slate-200 rounded-lg h-32 overflow-hidden flex items-center justify-center bg-white group">
          {preview ? <img src={preview} alt="Preview" className="w-full h-full object-contain p-2" /> : <div className="flex flex-col items-center text-slate-600"><FileText size={32} className="mb-2" /><span className="text-[10px] px-2 text-center line-clamp-2">{currentFile.name}</span></div>}
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

const MultiFileDropzone = ({ onFilesAdded, currentFiles, onRemove }: { onFilesAdded: (files: File[]) => void, currentFiles: File[], onRemove: (index: number) => void }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*': []} });

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={cn("border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-colors", isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}
      >
        <input {...getInputProps()} />
        <ImageIcon className={cn("mb-3", isDragActive ? "text-blue-500" : "text-slate-400")} size={32} />
        <div className="text-center">
            <p className="text-sm font-bold text-slate-700">افزودن تصاویر گالری</p>
            <p className="text-xs text-slate-500 mt-1">تصاویر را اینجا رها کنید یا کلیک کنید</p>
        </div>
      </div>
      
      {currentFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {currentFiles.map((file, idx) => (
                 <div key={idx} className="relative group aspect-square border rounded-lg overflow-hidden bg-white shadow-sm">
                     <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button type="button" onClick={() => onRemove(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"><Trash2 size={16} /></button>
                     </div>
                     <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">{idx + 1}</span>
                 </div>
             ))}
          </div>
      )}
    </div>
  );
};

const CreatableCombobox = ({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  
  const filtered = useMemo(() => {
    if (!query) return options;
    return options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  }, [options, query]);

  return (
    <div className="relative group w-full">
      <div className="flex items-center border rounded-md bg-white px-3 focus-within:ring-2 ring-slate-900 focus-within:ring-offset-1">
        <Search size={14} className="text-slate-400 ml-2 shrink-0" />
        <input 
          className="flex-1 h-9 bg-transparent outline-none text-sm placeholder:text-slate-400 text-left dir-ltr w-full"
          placeholder={placeholder}
          value={open ? query : value}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {value && !open && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-md shadow-lg dir-ltr w-full p-1">
           {query && !options.includes(query) && (
              <div 
                className="px-3 py-2 text-sm text-blue-600 bg-blue-50 cursor-pointer font-bold border-b" 
                onMouseDown={(e) => { e.preventDefault(); onChange(query); setOpen(false); }}
              >
                + افزودن "{query}"
              </div>
           )}
           {filtered.map(opt => (
               <div key={opt} className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer text-left rounded-sm transition-colors" onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); setQuery(""); }}>{opt}</div>
           ))}
        </div>
      )}
    </div>
  );
};


// --- MAIN COMPONENT ---

export default function CreateProductWizard() {
  const [authStatus, setAuthStatus] = useState<'logging_in' | 'authorized' | 'login_ui'>('logging_in');
  const [lightTypesDb, setLightTypesDb] = useState<LightType[]>([]);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState<number | null>(null);

  const linerCodes = useMemo(() => GENERATE_LINER_CODES(), []);

  // Files State
  const [files, setFiles] = useState<{ main: File | null; black: File | null; white: File | null; pdf: File | null; gallery: File[]; }>({ main: null, black: null, white: null, pdf: null, gallery: [] });

  // Form Setup
  const { register, control, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(productWizardSchema),
    defaultValues: {
      name: '', code_liner: '', category: '', short_description: '', no_pricing: '',
      is_active: "true", Custom_design: "false", active_body_color: "true", active_light_type: "true",
      specs: { dimensions: '', inset_cut_dimensions: '', row_in_liner: '', body_material: '', main_usage: '', installation_type: '', installation_method: '', notes: '', ertafa_saqf: '', code_liner: '' },
      pricing: [{ 
        model_name: 'اکونومی', price_per_meter: 0, model_key: PricingModelKey.ECO, warranty_months: 12,
        light: '', light_source_persion: 'ریسه 24 ولت', light_source: 'V24', density: '120',
        three_color: 'No', rgb: 'No', ip65: "false", ip20: "true", tage: '', spase_recommend: '',
        dimer: 'دارد', pricing_code_liner: '', suitable_for: '', longevity: '50000 ساعت',
        lumen: 1200, w_per_meter: '18 وات', power_source: '24 ولت', row_in_liner: '1'
      }],
      body_colors: [{ name: 'سفید', key: 'white_glossy', initial_stock: 50 }],
      faqs: [{ question: '', answer: '', code_liner: '' }],
      faq_sales: [{ question: '', answer: '', code_liner: '' }],
      light_type_values: [],
    }
  });

  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({ control, name: "pricing" });
  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({ control, name: "body_colors" });
  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({ control, name: "faqs" });
  const { fields: faqSalesFields, append: appendFaqSales, remove: removeFaqSales } = useFieldArray({ control, name: "faq_sales" });

  // --- AUTO LOGIN EFFECT ---
  useEffect(() => {
    const autoLogin = async () => {
      setAuthStatus('logging_in');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
           // Fix phone format: 0930 -> +98930
           const formattedPhone = ADMIN_PHONE.replace(/^0/, '+98');
           const { error } = await supabase.auth.signInWithPassword({ phone: formattedPhone, password: ADMIN_PASSWORD });
           if (error) {
              console.warn("Auto-login failed:", error.message);
              setAuthStatus('login_ui');
              return;
           }
        }
        const lights = await api.getLightTypes();
        setLightTypesDb(lights);
        setAuthStatus('authorized');
      } catch (error) {
        console.error("Auto Login Error:", error);
        setAuthStatus('login_ui');
      }
    };
    autoLogin();
  }, []);

  // --- HELPER FUNCTIONS ---
  
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleAiGenerate = async (index: number) => {
    setAiLoading(index);
    await new Promise(r => setTimeout(r, 1000));
    setValue(`pricing.${index}.suitable_for`, "این محصول با طراحی مدرن و نورپردازی یکنواخت، انتخابی ایده‌آل برای فضاهای معماری لوکس است.");
    setAiLoading(null);
  };

  const nextStep = async () => {
    let isValid = false;
    if (step === 1) isValid = await trigger(['name', 'code_liner', 'category']);
    if (step === 2) isValid = await trigger(['specs']);
    if (step === 3) isValid = true; // Gallery
    if (step === 4) isValid = await trigger(['pricing']);
    if (step === 5) isValid = await trigger(['body_colors']);
    if (step === 6) isValid = await trigger(['faqs', 'faq_sales']);
    
    if (isValid) setStep(prev => prev + 1);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setLogs([]);
    addLog("🚀 شروع فرآیند ثبت محصول...");

    try {
      // 1. Upload Main Files
      const codeFolder = data.code_liner;
      const uploadedUrls = { main: '', black: '', white: '', pdf: '' };
      if (files.main) { addLog(`📤 آپلود تصویر اصلی...`); uploadedUrls.main = await api.uploadFile(files.main, codeFolder, BUCKET_NAME); }
      if (files.black) { addLog(`📤 آپلود تصویر مشکی...`); uploadedUrls.black = await api.uploadFile(files.black, codeFolder, BUCKET_NAME); }
      if (files.white) { addLog(`📤 آپلود تصویر سفید...`); uploadedUrls.white = await api.uploadFile(files.white, codeFolder, BUCKET_NAME); }
      if (files.pdf) { addLog(`📤 آپلود کاتالوگ...`); uploadedUrls.pdf = await api.uploadFile(files.pdf, codeFolder, BUCKET_NAME); }

      // 2. Upload Gallery Files
      const galleryUrls: string[] = [];
      if (files.gallery.length > 0) {
        addLog(`🖼️ آپلود ${files.gallery.length} تصویر گالری...`);
        for (const file of files.gallery) {
          const url = await api.uploadFile(file, codeFolder, BUCKET_NAME);
          galleryUrls.push(url);
        }
      }

      // 3. Insert Product
      addLog("💾 ذخیره اطلاعات پایه محصول...");
      const product = await api.createProduct({
        name: data.name,
        code_liner: data.code_liner,
        category: data.category,
        short_description: data.short_description || '',
        no_pricing: data.no_pricing || '',
        is_active: data.is_active === 'true',
        Custom_design: data.Custom_design === 'true',
        active_body_color: data.active_body_color === 'true',
        active_light_type: data.active_light_type === 'true',
        image_url: uploadedUrls.main,
        image_black_url: uploadedUrls.black,
        image_white_url: uploadedUrls.white,
        Pdf_url: uploadedUrls.pdf
      });

      // 4. Insert Specs
      addLog("💾 ذخیره مشخصات فنی...");
      await api.createSpecs({ 
          ...data.specs, 
          product_id: product.id,
          dimensions: data.specs.dimensions || '',
          inset_cut_dimensions: data.specs.inset_cut_dimensions || '',
          row_in_liner: data.specs.row_in_liner || '',
          body_material: data.specs.body_material || '',
          main_usage: data.specs.main_usage || '',
          installation_type: data.specs.installation_type || '',
          installation_method: data.specs.installation_method || '',
          notes: data.specs.notes || '',
          ertafa_saqf: data.specs.ertafa_saqf || '',
      });

      // 5. Insert Gallery
      addLog("💾 ذخیره لینک‌های گالری...");
      await api.createProductGalleryBatch(galleryUrls.map((url, idx) => ({
        product_id: product.id,
        image_url: url,
        sort_order: idx + 1
      })));

      // 6. Insert Pricing
      addLog(`💾 ذخیره ${data.pricing.length} مدل قیمت‌گذاری...`);
      const pricingRows = await api.createPricingBatch(data.pricing.map(p => {
        const { ip65, ip20, three_color, rgb, ...rest } = p;
        return {
          ...rest,
          product_id: product.id,
          IP65: ip65 === 'true',
          IP20: ip20 === 'true',
          "3Color": three_color, 
          RGB: rgb,
          tage: p.tage || '',
          spase_recommend: p.spase_recommend || '',
          dimer: p.dimer || '',
          suitable_for: p.suitable_for || '',
          longevity: p.longevity || '',
          lumen: p.lumen || 0,
          w_per_meter: p.w_per_meter || '',
          power_source: p.power_source || '',
          row_in_liner: p.row_in_liner || ''
        };
      }));

      // 7. Insert Colors
      addLog(`💾 ذخیره ${data.body_colors.length} رنگ بدنه...`);
      const colorRows = await api.createBodyColorsBatch(data.body_colors.map(c => ({ ...c, product_id: product.id })));

      // 8. Insert FAQs
      addLog(`💾 ذخیره سوالات متداول (${data.faqs.length})...`);
      await api.createFAQBatch(data.faqs.map((f, idx) => ({
        product_id: product.id,
        question: f.question,
        answer: f.answer,
        code_liner: f.code_liner,
        sort: idx + 1
      })));

      // 9. Insert Sales FAQs
      addLog(`💾 ذخیره سوالات فروش (${data.faq_sales.length})...`);
      await api.createFAQSalesBatch(data.faq_sales.map((f, idx) => ({
        product_id: product.id,
        question: f.question,
        answer: f.answer,
        code_liner: f.code_liner,
        sort: idx + 1
      })));

      // 10. Generate Inventory
      addLog("⚙️ ایجاد موجودی انبار (Cartesian Product)...");
      const inventoryPayload: DbProductInventory[] = [];
      for (const p of pricingRows) {
        for (const c of colorRows) {
          for (const lightVal of data.light_type_values) {
            const dbLightId = findLightTypeId(lightTypesDb, lightVal);
            const lightPersianText = LIGHT_TYPE_INVENTORY_LABEL[lightVal] || lightVal;
            inventoryPayload.push({
              product_id: product.id,
              pricing_id: p.id,
              body_color_id: c.id,
              light_type_id: dbLightId,
              stock_qty: 0,
              status: 'موجود',
              status_pricing_model: 'موجود',
              status_body_color: 'موجود',
              status_light_type: 'موجود',
              code_liner: product.code_liner,
              model_name: p.model_name,
              body_Color: c.name,
              light_type: lightPersianText
            });
          }
        }
      }
      addLog(`📦 ذخیره ${inventoryPayload.length} رکورد موجودی...`);
      await api.createInventoryBatch(inventoryPayload);

      addLog("✅ عملیات موفقیت‌آمیز بود.");
      setSuccess(true);
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || JSON.stringify(error);
      addLog(`❌ خطا: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER ---

  if (authStatus === 'logging_in') {
    return <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6"><Loader2 className="w-16 h-16 animate-spin text-slate-900" /><div className="text-center"><h2 className="text-xl font-bold">در حال ورود به پنل...</h2><p className="text-slate-500 font-mono text-sm">{ADMIN_PHONE}</p></div></div>;
  }

  if (authStatus === 'login_ui') {
    return <LoginScreen onLoginSuccess={async () => { try { const lights = await api.getLightTypes(); setLightTypesDb(lights); setAuthStatus('authorized'); } catch (e) { setAuthStatus('authorized'); } }} />;
  }

  if (success) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
           <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600"><PackageCheck size={48} /></div>
           <h2 className="text-3xl font-bold text-slate-900 mb-2">محصول با موفقیت ثبت شد</h2>
           <Button onClick={() => window.location.reload()} size="lg" className="bg-green-600 hover:bg-green-700 shadow-lg">ثبت محصول جدید</Button>
        </div>
      )
  }

  return (
    <div className="max-w-6xl mx-auto p-2 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">ایجاد محصول جدید</h1>
            <p className="text-slate-500 mt-1">نسخه نهایی (Gallery & FAQs)</p>
         </div>
         <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border shadow-sm"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span className="text-xs font-bold text-slate-600">Admin</span></div>
      </div>

      <Card className="shadow-xl bg-white border-0 ring-1 ring-slate-100">
        <CardHeader className="border-b bg-slate-50/50">
           <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">{step}</span>
              {step === 1 && "اطلاعات پایه"}
              {step === 2 && "مشخصات فنی"}
              {step === 3 && "گالری تصاویر"}
              {step === 4 && "مدل‌های قیمت‌گذاری"}
              {step === 5 && "رنگ‌بندی بدنه"}
              {step === 6 && "سوالات متداول (FAQ)"}
              {step === 7 && "انبار (Inventory)"}
           </CardTitle>
        </CardHeader>
        
        <CardContent className="py-8 min-h-[500px]">
          
          {/* STEP 1: PRODUCT INFO */}
          <div className={cn("space-y-8", step === 1 ? "block" : "hidden")}>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>نام محصول</Label><Input {...register("name")} />{errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}</div>
                <div className="space-y-2"><Label>کد لاینر (پوشه)</Label><Input {...register("code_liner")} className="dir-ltr text-left font-mono" />{errors.code_liner && <span className="text-red-500 text-xs">{errors.code_liner.message}</span>}</div>
                <div className="space-y-2"><Label>دسته بندی</Label><Input {...register("category")} />{errors.category && <span className="text-red-500 text-xs">{errors.category.message}</span>}</div>
                <div className="space-y-2"><Label>توضیحات کوتاه</Label><Textarea {...register("short_description")} /></div>
                <div className="md:col-span-2 space-y-2"><Label>توضیحات (بدون قیمت)</Label><Input {...register("no_pricing")} /></div>
             </div>
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
               <div className="space-y-2"><Label>is_active</Label><NativeSelect {...register("is_active")}><option value="true">فعال</option><option value="false">غیرفعال</option></NativeSelect></div>
               <div className="space-y-2"><Label>Custom_design</Label><NativeSelect {...register("Custom_design")}><option value="false">غیرفعال</option><option value="true">فعال</option></NativeSelect></div>
               <div className="space-y-2"><Label>active_body_color</Label><NativeSelect {...register("active_body_color")}><option value="true">فعال</option><option value="false">غیرفعال</option></NativeSelect></div>
               <div className="space-y-2"><Label>active_light_type</Label><NativeSelect {...register("active_light_type")}><option value="true">فعال</option><option value="false">غیرفعال</option></NativeSelect></div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FileUploadZone label="تصویر اصلی" accept={{'image/*': []}} currentFile={files.main} onFileSelect={f => setFiles(p => ({...p, main: f}))} onRemove={() => setFiles(p => ({...p, main: null}))} />
                <FileUploadZone label="تصویر مشکی" accept={{'image/*': []}} currentFile={files.black} onFileSelect={f => setFiles(p => ({...p, black: f}))} onRemove={() => setFiles(p => ({...p, black: null}))} />
                <FileUploadZone label="تصویر سفید" accept={{'image/*': []}} currentFile={files.white} onFileSelect={f => setFiles(p => ({...p, white: f}))} onRemove={() => setFiles(p => ({...p, white: null}))} />
                <FileUploadZone label="فایل PDF" accept={{'application/pdf': ['.pdf']}} currentFile={files.pdf} onFileSelect={f => setFiles(p => ({...p, pdf: f}))} onRemove={() => setFiles(p => ({...p, pdf: null}))} />
             </div>
          </div>

          {/* STEP 2: SPECS */}
          <div className={cn("space-y-6", step === 2 ? "block" : "hidden")}>
             <div className="grid md:grid-cols-3 gap-6">
               <div className="space-y-2"><Label>کد لاینر (مشخصات)</Label><Controller control={control} name="specs.code_liner" render={({ field }) => (<CreatableCombobox options={linerCodes} value={field.value} onChange={field.onChange} placeholder="انتخاب کنید..." />)} /></div>
               {['dimensions', 'inset_cut_dimensions', 'row_in_liner', 'body_material', 'main_usage', 'installation_type', 'installation_method', 'ertafa_saqf', 'notes'].map(f => (
                   <div key={f} className="space-y-2"><Label>{f}</Label><Input {...register(`specs.${f}` as any)} /></div>
               ))}
             </div>
          </div>

          {/* STEP 3: GALLERY */}
          <div className={cn("space-y-6", step === 3 ? "block" : "hidden")}>
             <MultiFileDropzone 
                onFilesAdded={newFiles => setFiles(prev => ({ ...prev, gallery: [...prev.gallery, ...newFiles] }))}
                currentFiles={files.gallery}
                onRemove={(idx) => setFiles(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }))}
             />
             <div className="text-sm text-slate-500 bg-blue-50 p-4 rounded-lg flex items-center gap-2"><ImageIcon size={16} /> تعداد تصاویر انتخاب شده: {files.gallery.length}</div>
          </div>

          {/* STEP 4: PRICING */}
          <div className={cn("space-y-6", step === 4 ? "block" : "hidden")}>
             {pricingFields.map((field, index) => (
                <Card key={field.id} className="border-2 border-slate-200 relative overflow-visible">
                   <div className="absolute -top-3 right-4 bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold">مدل {index + 1}</div>
                   <CardContent className="p-6 pt-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50/30">
                      <div className="space-y-2"><Label>نام مدل</Label><Input {...register(`pricing.${index}.model_name`)} /></div>
                      <div className="space-y-2"><Label>کد لاینر</Label><Controller control={control} name={`pricing.${index}.pricing_code_liner`} render={({ field }) => (<CreatableCombobox options={linerCodes} value={field.value} onChange={field.onChange} placeholder="جستجو..." />)} /></div>
                      <div className="space-y-2"><Label>قیمت</Label><Input type="number" {...register(`pricing.${index}.price_per_meter`, {valueAsNumber: true})} /></div>
                      <div className="space-y-2"><Label>گارانتی</Label><Input type="number" {...register(`pricing.${index}.warranty_months`, {valueAsNumber: true})} /></div>
                      <div className="space-y-2"><Label>Light Title</Label><Input {...register(`pricing.${index}.light`)} /></div>
                      <div className="space-y-2"><Label>Light FA</Label><NativeSelect {...register(`pricing.${index}.light_source_persion`)}>{["ریسه 24 ولت", "ریسه 300 میلی آمپر", "ماژول 300 میلی آمپر", "ریسه 12 ولت", "ریسه 220 ولت"].map(o => <option key={o} value={o}>{o}</option>)}</NativeSelect></div>
                      <div className="space-y-2"><Label>Light Code</Label><NativeSelect {...register(`pricing.${index}.light_source`)}>{["V24", "V12", "V220", "STRIP300", "MODULE300", "RGB", "TRI"].map(o => <option key={o} value={o}>{o}</option>)}</NativeSelect></div>
                      <div className="space-y-2"><Label>Density</Label><NativeSelect {...register(`pricing.${index}.density`)}>{["240", "120", "60"].map(o => <option key={o} value={o}>{o}</option>)}</NativeSelect></div>
                      <div className="space-y-2"><Label>3Color</Label><NativeSelect {...register(`pricing.${index}.three_color`)}><option value="ناموجود">ناموجود</option><option value="No">غیر فعال</option><option value="3Color">3 حالته</option></NativeSelect></div>
                      <div className="space-y-2"><Label>RGB</Label><NativeSelect {...register(`pricing.${index}.rgb`)}><option value="ناموجود">ناموجود</option><option value="No">غیر فعال</option><option value="RGB">RGB</option></NativeSelect></div>
                      <div className="space-y-2"><Label>Key</Label><NativeSelect {...register(`pricing.${index}.model_key`)}>{Object.values(PricingModelKey).map(k => <option key={k} value={k}>{k}</option>)}</NativeSelect></div>
                      <div className="space-y-2"><Label>IP65</Label><NativeSelect {...register(`pricing.${index}.ip65`)}><option value="false">ندارد</option><option value="true">دارد</option></NativeSelect></div>
                      <div className="space-y-2"><Label>IP20</Label><NativeSelect {...register(`pricing.${index}.ip20`)}><option value="true">دارد</option><option value="false">ندارد</option></NativeSelect></div>
                      <div className="space-y-2"><Label>Tage</Label><Input {...register(`pricing.${index}.tage`)} /></div>
                      <div className="space-y-2"><Label>Space Rec</Label><Input {...register(`pricing.${index}.spase_recommend`)} /></div>
                      <div className="space-y-2"><Label>Dimer</Label><Input {...register(`pricing.${index}.dimer`)} /></div>
                      <div className="space-y-2"><Label>Longevity</Label><Input {...register(`pricing.${index}.longevity`)} /></div>
                      <div className="space-y-2"><Label>Lumen</Label><Input type="number" {...register(`pricing.${index}.lumen`, {valueAsNumber: true})} /></div>
                      <div className="space-y-2"><Label>W/m</Label><Input {...register(`pricing.${index}.w_per_meter`)} /></div>
                      <div className="space-y-2"><Label>Power Source</Label><Input {...register(`pricing.${index}.power_source`)} /></div>
                      <div className="space-y-2"><Label>Row in Liner</Label><Input {...register(`pricing.${index}.row_in_liner`)} /></div>
                      <div className="md:col-span-4 space-y-2 mt-2"><div className="flex justify-between items-end"><Label>توضیحات مدل (AI)</Label><Button type="button" size="sm" variant="secondary" onClick={() => handleAiGenerate(index)} disabled={aiLoading === index}>{aiLoading === index ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} تولید خودکار</Button></div><Textarea {...register(`pricing.${index}.suitable_for`)} /></div>
                   </CardContent>
                   <CardFooter className="justify-end bg-slate-50 border-t p-2"><Button variant="destructive" size="sm" onClick={() => removePricing(index)}><Trash2 size={14} /> حذف مدل</Button></CardFooter>
                </Card>
             ))}
             <Button variant="outline" className="w-full border-dashed py-6" onClick={() => appendPricing({ model_name: '', price_per_meter: 0, model_key: PricingModelKey.ECO, warranty_months: 12, light: '', light_source_persion: 'ریسه 24 ولت', light_source: 'V24', density: '120', three_color: 'No', rgb: 'No', ip65: "false", ip20: "true", tage: '', spase_recommend: '', dimer: 'دارد', pricing_code_liner: '', suitable_for: '', longevity: '50000 ساعت', lumen: 1200, w_per_meter: '18 وات', power_source: '24 ولت', row_in_liner: '1' })}><Plus size={16} /> افزودن مدل قیمت جدید</Button>
          </div>

          {/* STEP 5: COLORS */}
          <div className={cn("space-y-6", step === 5 ? "block" : "hidden")}>
             {colorFields.map((field, index) => (
                <div key={field.id} className="grid md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                   <div className="md:col-span-5 space-y-2"><Label>نام رنگ</Label><Input {...register(`body_colors.${index}.name`)} /></div>
                   <div className="md:col-span-4 space-y-2"><Label>کلید</Label><NativeSelect {...register(`body_colors.${index}.key`)}><option value="white_glossy">سفید</option><option value="black_matte">مشکی</option></NativeSelect></div>
                   <div className="md:col-span-2 space-y-2"><Label>موجودی</Label><Input type="number" {...register(`body_colors.${index}.initial_stock`, {valueAsNumber: true})} /></div>
                   <div className="md:col-span-1"><Button variant="destructive" size="icon" onClick={() => removeColor(index)}><Trash2 size={16} /></Button></div>
                </div>
             ))}
             <Button variant="outline" className="w-full border-dashed py-4" onClick={() => appendColor({ name: '', key: 'white_glossy', initial_stock: 0 })}><Plus size={16} /> رنگ جدید</Button>
          </div>

          {/* STEP 6: FAQS */}
          <div className={cn("space-y-8", step === 6 ? "block" : "hidden")}>
             {/* General FAQ */}
             <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-700"><HelpCircle /> سوالات متداول عمومی (FAQ)</h3>
                <div className="space-y-4">
                  {faqFields.map((field, index) => (
                    <Card key={field.id} className="border-indigo-100">
                      <CardContent className="p-4 grid md:grid-cols-12 gap-4">
                         <div className="md:col-span-12 flex justify-between"><span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">سوال {index + 1}</span><Button variant="ghost" size="sm" className="h-6 text-red-500" onClick={() => removeFaq(index)}><Trash2 size={12} /></Button></div>
                         <div className="md:col-span-6 space-y-2"><Label>سوال</Label><Input {...register(`faqs.${index}.question`)} /></div>
                         <div className="md:col-span-6 space-y-2"><Label>کد لاینر (قابل تایپ)</Label><Controller control={control} name={`faqs.${index}.code_liner`} render={({ field }) => (<CreatableCombobox options={linerCodes} value={field.value} onChange={field.onChange} placeholder="انتخاب یا تایپ کنید..." />)} /></div>
                         <div className="md:col-span-12 space-y-2"><Label>جواب</Label><Textarea {...register(`faqs.${index}.answer`)} /></div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" className="w-full border-dashed border-indigo-200 text-indigo-600" onClick={() => appendFaq({ question: '', answer: '', code_liner: '' })}><Plus size={16} /> سوال جدید</Button>
                </div>
             </div>
             
             {/* Sales FAQ */}
             <div className="pt-4 border-t">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-700"><HelpCircle /> سوالات متداول فروش (FAQsales)</h3>
                <div className="space-y-4">
                  {faqSalesFields.map((field, index) => (
                    <Card key={field.id} className="border-emerald-100">
                      <CardContent className="p-4 grid md:grid-cols-12 gap-4">
                         <div className="md:col-span-12 flex justify-between"><span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">سوال فروش {index + 1}</span><Button variant="ghost" size="sm" className="h-6 text-red-500" onClick={() => removeFaqSales(index)}><Trash2 size={12} /></Button></div>
                         <div className="md:col-span-6 space-y-2"><Label>سوال</Label><Input {...register(`faq_sales.${index}.question`)} /></div>
                         <div className="md:col-span-6 space-y-2"><Label>کد لاینر (قابل تایپ)</Label><Controller control={control} name={`faq_sales.${index}.code_liner`} render={({ field }) => (<CreatableCombobox options={linerCodes} value={field.value} onChange={field.onChange} placeholder="انتخاب یا تایپ کنید..." />)} /></div>
                         <div className="md:col-span-12 space-y-2"><Label>جواب</Label><Textarea {...register(`faq_sales.${index}.answer`)} /></div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" className="w-full border-dashed border-emerald-200 text-emerald-600" onClick={() => appendFaqSales({ question: '', answer: '', code_liner: '' })}><Plus size={16} /> سوال فروش جدید</Button>
                </div>
             </div>
          </div>

          {/* STEP 7: INVENTORY */}
          <div className={cn("space-y-8", step === 7 ? "block" : "hidden")}>
             <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
               <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><Lightbulb size={20} /> نورهای قابل پشتیبانی</h3>
               <div className="grid md:grid-cols-3 gap-4">
                 {[{ val: 'natural', label: 'نچرال' }, { val: 'warm', label: 'آفتابی' }, { val: 'cool', label: 'سفید' }, { val: 'rgb', label: 'RGB' }, { val: 'tri', label: '3 حالته' }].map((opt) => (
                   <Controller key={opt.val} control={control} name="light_type_values" render={({ field }) => {
                       const isChecked = field.value.includes(opt.val);
                       return (
                           <div className={cn("flex items-center space-x-reverse space-x-3 p-4 rounded-lg border cursor-pointer", isChecked ? "bg-white border-blue-500 ring-2" : "bg-white/50 border-slate-200")} onClick={() => isChecked ? field.onChange(field.value.filter(v => v !== opt.val)) : field.onChange([...field.value, opt.val])}>
                                <div className={cn("w-5 h-5 rounded border flex items-center justify-center", isChecked ? "bg-blue-500 border-blue-500" : "border-slate-300")}>{isChecked && <Check size={14} className="text-white" />}</div>
                                <span className="font-medium text-slate-800 select-none">{opt.label}</span>
                           </div>
                       );
                     }} />
                 ))}
               </div>
               {errors.light_type_values && <p className="text-red-500 text-sm mt-4 font-bold">⚠️ {errors.light_type_values.message}</p>}
             </div>
             <div className="bg-slate-50 p-6 rounded-xl space-y-2 text-sm text-slate-600 border border-slate-200">
                 <div className="flex justify-between border-b pb-2"><span>مدل قیمت:</span><span className="font-bold">{watch('pricing').length}</span></div>
                 <div className="flex justify-between border-b pb-2"><span>رنگ بدنه:</span><span className="font-bold">{watch('body_colors').length}</span></div>
                 <div className="flex justify-between border-b pb-2"><span>حالات نوری:</span><span className="font-bold">{watch('light_type_values').length}</span></div>
                 <div className="flex justify-between pt-2 text-base text-slate-800"><span>مجموع رکورد انبار:</span><span className="font-bold bg-yellow-200 px-3 py-1 rounded-full text-black">{watch('pricing').length * watch('body_colors').length * (watch('light_type_values').length || 1)}</span></div>
             </div>
          </div>

        </CardContent>
        <CardFooter className="flex justify-between border-t bg-slate-50/50 p-6">
          <Button variant="outline" onClick={() => setStep(prev => prev - 1)} disabled={step === 1 || isSubmitting}><ChevronRight size={16} className="ml-2" /> مرحله قبل</Button>
          {step < 7 ? <Button onClick={nextStep} disabled={authStatus !== 'authorized'}>مرحله بعد <ChevronLeft size={16} className="mr-2" /></Button> : <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || authStatus !== 'authorized'} className="bg-green-600 hover:bg-green-700 w-48 shadow-lg">{isSubmitting ? <Loader2 className="animate-spin" /> : "ثبت و ایجاد انبار"}</Button>}
        </CardFooter>
      </Card>
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
                <CardHeader className="bg-slate-900 text-white"><CardTitle className="flex items-center gap-3 text-lg"><Loader2 className="animate-spin" /> در حال پردازش...</CardTitle></CardHeader>
                <CardContent className="p-0 bg-slate-950"><div className="text-slate-100 p-6 font-mono text-xs h-64 overflow-y-auto space-y-2 dir-ltr">{logs.map((log, idx) => <div key={idx} className="text-emerald-400 border-l-2 border-emerald-500 pl-2">> {log}</div>)}<div className="animate-pulse text-slate-500">> _</div></div></CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}