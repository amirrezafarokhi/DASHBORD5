import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, Trash2, CheckCircle2, Loader2, UploadCloud, FileText, X, Search, Image as ImageIcon, Check, Edit, AlertTriangle, LayoutList, PlusSquare
} from 'lucide-react';

import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter, NativeSelect, Textarea, cn } from './ui/Primitives';
import { api } from '../services/api';
import { PricingModelKey, LightType, DbProductInventory, DbProduct } from '../types';
import { supabase } from '../lib/supabaseClient';

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

const LIGHT_TYPE_INVENTORY_LABEL: Record<string, string> = {
  natural: 'نچرال', warm: 'آفتابی', cool: 'سفید', rgb: 'RGB (مولتی کالر)', tri: '3 حالته (نچرال ، سفید ، آفتابی)'
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
  dimensions: z.string().optional(), inset_cut_dimensions: z.string().optional(), row_in_liner: z.string().optional(), body_material: z.string().optional(), main_usage: z.string().optional(), installation_type: z.string().optional(), installation_method: z.string().optional(), notes: z.string().optional(), ertafa_saqf: z.string().optional(), code_liner: z.string().min(1, "کد لاینر (مشخصات) الزامی است"),
});

const pricingSchema = z.object({
  model_name: z.string().min(1, "نام مدل الزامی است"), price_per_meter: z.number().min(0), warranty_months: z.number().min(0), light: z.string(), light_source_persion: z.string(), light_source: z.string(), density: z.string(), three_color: z.string(), rgb: z.string(), model_key: z.nativeEnum(PricingModelKey), ip65: z.enum(["true", "false"]), ip20: z.enum(["true", "false"]), tage: z.string().optional(), spase_recommend: z.string().optional(), dimer: z.string().optional(), pricing_code_liner: z.string().min(1, "کد لاینر (قیمت) الزامی است"), suitable_for: z.string().optional(), longevity: z.string().optional(), lumen: z.number().optional(), w_per_meter: z.string().optional(), power_source: z.string().optional(), row_in_liner: z.string().optional()
});

const faqSchema = z.object({
  question: z.string().min(1, "سوال الزامی است"), answer: z.string().min(1, "جواب الزامی است"), code_liner: z.string().min(1, "کد لاینر الزامی است"),
});

const bodyColorSchema = z.object({
  name: z.string().min(1, "نام رنگ الزامی است"), key: z.enum(["white_glossy", "black_matte"]), initial_stock: z.number().min(0),
});

const productWizardSchema = z.object({
  name: z.string().min(3, "نام محصول باید حداقل ۳ کاراکتر باشد"), code_liner: z.string().min(1, "کد لاینر اصلی الزامی است"), category: z.string().min(1, "دسته‌بندی الزامی است"), short_description: z.string().optional(), no_pricing: z.string().optional(),
  is_active: z.enum(["true", "false"]), Custom_design: z.enum(["true", "false"]), active_body_color: z.enum(["true", "false"]), active_light_type: z.enum(["true", "false"]),
  specs: specsSchema,
  pricing: z.array(pricingSchema).min(1, "حداقل یک مدل قیمت‌گذاری لازم است"),
  body_colors: z.array(bodyColorSchema).min(1, "حداقل یک رنگ بدنه لازم است"),
  faqs: z.array(faqSchema), faq_sales: z.array(faqSchema),
  light_type_values: z.array(z.string()).min(1, "حداقل یک نوع نور باید انتخاب شود"),
});

type FormData = z.infer<typeof productWizardSchema>;

// --- HELPER COMPONENTS ---

const FileUploadZone = ({ label, accept, onFileSelect, currentFile, existingUrl, onRemove }: { label: string, accept: Record<string, string[]>, onFileSelect: (f: File) => void, currentFile: File | null, existingUrl?: string, onRemove: () => void }) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFile) { setPreview(null); return; }
    if (currentFile.type.startsWith('image/')) { const url = URL.createObjectURL(currentFile); setPreview(url); return () => URL.revokeObjectURL(url); }
  }, [currentFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => { if (acceptedFiles?.[0]) onFileSelect(acceptedFiles[0]); }, [onFileSelect]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles: 1 });

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-700 font-bold">{label}</Label>
      {!currentFile && !existingUrl ? (
        <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors", isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}>
          <input {...getInputProps()} />
          <UploadCloud className={cn("mb-2", isDragActive ? "text-blue-500" : "text-slate-400")} size={24} />
          <span className="text-[10px] text-slate-500 text-center px-2">{isDragActive ? "رها کنید..." : "انتخاب فایل"}</span>
        </div>
      ) : (
        <div className="relative border border-slate-200 rounded-lg h-32 overflow-hidden flex items-center justify-center bg-white group">
          {currentFile ? (
             preview ? <img src={preview} alt="Preview" className="w-full h-full object-contain p-2" /> : <div className="flex flex-col items-center text-slate-600"><FileText size={32} /><span className="text-[10px]">{currentFile.name}</span></div>
          ) : (
             existingUrl ? <img src={existingUrl} alt="Existing" className="w-full h-full object-contain p-2" /> : null
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

const MultiFileDropzone = ({ onFilesAdded, currentFiles, existingUrls, onRemoveNew, onRemoveExisting }: { onFilesAdded: (files: File[]) => void, currentFiles: File[], existingUrls: string[], onRemoveNew: (i: number) => void, onRemoveExisting: (i: number) => void }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => onFilesAdded(acceptedFiles), [onFilesAdded]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*': []} });

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className={cn("border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-colors", isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100")}>
        <input {...getInputProps()} />
        <ImageIcon className={cn("mb-3", isDragActive ? "text-blue-500" : "text-slate-400")} size={32} />
        <div className="text-center"><p className="text-sm font-bold text-slate-700">گالری تصاویر</p><p className="text-xs text-slate-500 mt-1">تصاویر جدید را اینجا رها کنید</p></div>
      </div>
      {(currentFiles.length > 0 || existingUrls.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {existingUrls.map((url, idx) => (
                 <div key={`ex-${idx}`} className="relative group aspect-square border rounded-lg overflow-hidden bg-slate-100 shadow-sm">
                     <img src={url} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => onRemoveExisting(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"><Trash2 size={16} /></button></div>
                     <span className="absolute bottom-1 right-1 bg-blue-600 text-white text-[10px] px-1 rounded">قدیمی</span>
                 </div>
             ))}
             {currentFiles.map((file, idx) => (
                 <div key={`new-${idx}`} className="relative group aspect-square border rounded-lg overflow-hidden bg-white shadow-sm">
                     <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => onRemoveNew(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"><Trash2 size={16} /></button></div>
                     <span className="absolute bottom-1 right-1 bg-green-600 text-white text-[10px] px-1 rounded">جدید</span>
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
  const filtered = useMemo(() => query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options, [options, query]);

  return (
    <div className="relative group w-full">
      <div className="flex items-center border rounded-md bg-white px-3 focus-within:ring-2 ring-slate-900">
        <Search size={14} className="text-slate-400 ml-2" />
        <input 
          className="flex-1 h-9 bg-transparent outline-none text-sm placeholder:text-slate-400 text-left dir-ltr w-full" 
          placeholder={placeholder} 
          value={open ? query : value} 
          onChange={e => { 
            const val = e.target.value;
            setQuery(val); 
            onChange(val); // Custom typing updates value immediately
            setOpen(true); 
          }} 
          onFocus={() => setOpen(true)} 
          onBlur={() => setTimeout(() => setOpen(false), 200)} 
        />
        {value && !open && <CheckCircle2 size={14} className="text-green-500" />}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border rounded-md shadow-lg dir-ltr w-full p-1">
           {query && !options.includes(query) && <div className="px-3 py-2 text-sm text-blue-600 bg-blue-50 cursor-pointer font-bold border-b" onMouseDown={(e) => { e.preventDefault(); onChange(query); setOpen(false); }}>+ افزودن "{query}"</div>}
           {filtered.map(opt => <div key={opt} className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer text-left" onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); setQuery(""); }}>{opt}</div>)}
        </div>
      )}
    </div>
  );
};

// --- MAIN MANAGER COMPONENT ---

export default function ProductManager() {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [authStatus, setAuthStatus] = useState<'logging_in' | 'authorized'>('logging_in');
  const [lightTypesDb, setLightTypesDb] = useState<LightType[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  // --- AUTO LOGIN & INIT ---
  useEffect(() => {
    const init = async () => {
      setAuthStatus('logging_in');
      try {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
           // Fix phone number formatting: 0930... -> +98930...
           const formattedPhone = ADMIN_PHONE.replace(/^0/, '+98');
           const { error } = await supabase.auth.signInWithPassword({ phone: formattedPhone, password: ADMIN_PASSWORD });
           if (error) throw error;
        }
        const [lights, prods] = await Promise.all([
          api.getLightTypes(),
          api.getAllProducts()
        ]);
        setLightTypesDb(lights);
        setProducts(prods);
        setAuthStatus('authorized');
      } catch (e) { 
        console.error("Auth/Init Failed", e); 
        // Force retry or show error (in simple version just stays spinning or we can retry)
      }
    };
    init();
  }, []);

  const handleCreateClick = () => { setEditId(null); setView('CREATE'); };
  const handleEditClick = (id: string) => { setEditId(id); setView('EDIT'); };
  
  const handleRefreshList = async () => {
    const list = await api.getAllProducts();
    setProducts(list);
  };

  const handleDelete = async (id: string, hard: boolean) => {
    if (!confirm(hard ? "آیا از حذف دائمی محصول اطمینان دارید؟" : "آیا محصول به سطل زباله منتقل شود؟")) return;
    try {
      await api.deleteProduct(id, hard);
      handleRefreshList();
    } catch (e) { alert("خطا در حذف محصول"); }
  };

  if (authStatus === 'logging_in') return <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50"><Loader2 className="w-16 h-16 animate-spin text-slate-900" /><h2 className="text-xl font-bold text-slate-700">در حال ورود به پنل...</h2></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 pb-4 bg-white/50 p-4 rounded-lg">
        <Button variant={view === 'CREATE' ? 'default' : 'outline'} onClick={handleCreateClick} className="gap-2 h-12 text-base shadow-sm"><PlusSquare /> افزودن محصول جدید</Button>
        <Button variant={view === 'LIST' ? 'default' : 'outline'} onClick={() => { setEditId(null); setView('LIST'); handleRefreshList(); }} className="gap-2 h-12 text-base shadow-sm"><LayoutList /> مدیریت و ویرایش محصولات</Button>
      </div>

      {view === 'LIST' && <ProductList products={products} onEdit={handleEditClick} onDelete={handleDelete} />}
      
      {(view === 'CREATE' || view === 'EDIT') && (
         <ProductWizard 
            mode={view} 
            editId={editId} 
            lightTypes={lightTypesDb} 
            onCancel={() => setView('LIST')} 
            onSuccess={() => { setView('LIST'); handleRefreshList(); }} 
         />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ProductList({ products, onEdit, onDelete }: { products: DbProduct[], onEdit: (id: string) => void, onDelete: (id: string, hard: boolean) => void }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p => p.name.includes(search) || p.code_liner.includes(search));

  return (
    <Card>
      <CardHeader><div className="flex justify-between items-center"><CardTitle>لیست محصولات ({products.length})</CardTitle><div className="relative w-64"><Search className="absolute right-3 top-2.5 text-slate-400" size={16} /><Input placeholder="جستجو نام یا کد..." className="pr-10" value={search} onChange={e => setSearch(e.target.value)} /></div></div></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="p-3">تصویر</th><th className="p-3">نام محصول</th><th className="p-3">کد لاینر</th><th className="p-3">بروزرسانی</th><th className="p-3">عملیات</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-3"><img src={p.image_url} className="w-10 h-10 rounded object-cover border" alt="" /></td>
                  <td className="p-3 font-bold">{p.name}</td>
                  <td className="p-3 font-mono dir-ltr text-right">{p.code_liner}</td>
                  <td className="p-3 text-slate-400 text-xs">{new Date(p.updated_at || '').toLocaleDateString('fa-IR')}</td>
                  <td className="p-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(p.id)}><Edit size={14} className="ml-1" /> ویرایش</Button>
                    <Button size="sm" variant="secondary" className="text-yellow-600 hover:bg-yellow-50" onClick={() => onDelete(p.id, false)}>سطل زباله</Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(p.id, true)} title="حذف کامل"><Trash2 size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center p-8 text-slate-400">محصولی یافت نشد</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductWizard({ mode, editId, lightTypes, onCancel, onSuccess }: { mode: 'CREATE' | 'EDIT', editId: string | null, lightTypes: LightType[], onCancel: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Files State
  const [files, setFiles] = useState<{ main: File | null; black: File | null; white: File | null; pdf: File | null; gallery: File[]; }>({ main: null, black: null, white: null, pdf: null, gallery: [] });
  // Existing URLs (For Edit Mode)
  const [existingUrls, setExistingUrls] = useState<{ main: string; black: string; white: string; pdf: string; gallery: string[]; }>({ main: '', black: '', white: '', pdf: '', gallery: [] });

  const { register, control, handleSubmit, trigger, setValue, reset, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(productWizardSchema),
    defaultValues: {
      is_active: "true", Custom_design: "false", active_body_color: "true", active_light_type: "true",
      specs: { code_liner: '' }, 
      pricing: [{ model_name: 'اکونومی', price_per_meter: 0, model_key: PricingModelKey.ECO, warranty_months: 12, light: '', light_source_persion: 'ریسه 24 ولت', light_source: 'V24', density: '120', three_color: 'No', rgb: 'No', ip65: "false", ip20: "true", pricing_code_liner: '' }],
      body_colors: [{ name: 'سفید', key: 'white_glossy', initial_stock: 50 }],
      faqs: [{ question: '', answer: '', code_liner: '' }], faq_sales: [{ question: '', answer: '', code_liner: '' }], light_type_values: []
    }
  });

  const { fields: pricingFields, append: appendPricing, remove: removePricing } = useFieldArray({ control, name: "pricing" });
  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({ control, name: "body_colors" });
  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({ control, name: "faqs" });
  const { fields: faqSalesFields, append: appendFaqSales, remove: removeFaqSales } = useFieldArray({ control, name: "faq_sales" });
  
  const linerCodes = useMemo(() => GENERATE_LINER_CODES(), []);
  const addLog = (m: string) => setLogs(p => [...p, m]);

  // --- POPULATE EDIT DATA ---
  useEffect(() => {
    if (mode === 'EDIT' && editId) {
      const load = async () => {
        setLoadingData(true);
        try {
          const full = await api.getProductFull(editId);
          // Map DB to Form (Handling nulls with || '')
          reset({
            name: full.product.name,
            code_liner: full.product.code_liner,
            category: full.product.category,
            short_description: full.product.short_description || '',
            no_pricing: full.product.no_pricing || '',
            is_active: full.product.is_active ? "true" : "false",
            Custom_design: full.product.Custom_design ? "true" : "false",
            active_body_color: full.product.active_body_color ? "true" : "false",
            active_light_type: full.product.active_light_type ? "true" : "false",
            specs: { 
              ...full.specs, 
              // Ensure no nulls in specs
              dimensions: full.specs?.dimensions || '',
              inset_cut_dimensions: full.specs?.inset_cut_dimensions || '',
              row_in_liner: full.specs?.row_in_liner || '',
              body_material: full.specs?.body_material || '',
              main_usage: full.specs?.main_usage || '',
              installation_type: full.specs?.installation_type || '',
              installation_method: full.specs?.installation_method || '',
              notes: full.specs?.notes || '',
              ertafa_saqf: full.specs?.ertafa_saqf || '',
              code_liner: full.specs?.code_liner || full.product.code_liner
            },
            pricing: full.pricing.map((p: any) => ({
              ...p,
              three_color: p["3Color"] || 'No', 
              rgb: p["RGB"] || 'No',
              ip65: p.IP65 ? "true" : "false", 
              ip20: p.IP20 ? "true" : "false",
              model_key: p.model_key as PricingModelKey,
              // Handle optional strings
              tage: p.tage || '', spase_recommend: p.spase_recommend || '', dimer: p.dimer || '', suitable_for: p.suitable_for || '', longevity: p.longevity || '', w_per_meter: p.w_per_meter || '', power_source: p.power_source || '', row_in_liner: p.row_in_liner || ''
            })),
            body_colors: full.body_colors.map((c: any) => ({ name: c.name, key: c.key as any, initial_stock: c.initial_stock })),
            faqs: full.faqs.map((f: any) => ({ question: f.question, answer: f.answer, code_liner: f.code_liner })),
            faq_sales: full.faq_sales.map((f: any) => ({ question: f.question, answer: f.answer, code_liner: f.code_liner })),
            light_type_values: [] // User must re-select for inventory generation on Edit
          });
          
          setExistingUrls({
            main: full.product.image_url,
            black: full.product.image_black_url,
            white: full.product.image_white_url,
            pdf: full.product.Pdf_url,
            gallery: full.gallery.map((g: any) => g.image_url)
          });
        } catch (e) { console.error(e); alert("خطا در دریافت اطلاعات محصول"); onCancel(); }
        finally { setLoadingData(false); }
      };
      load();
    }
  }, [mode, editId, reset, onCancel]);

  const onError = (errors: any) => {
    console.error("Validation Errors:", errors);
    alert("لطفاً خطاهای فرم را بررسی کنید. فیلدهای الزامی قرمز شده‌اند.");
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true); setLogs([]);
    try {
      const codeFolder = data.code_liner;
      const bucket = BUCKET_NAME;

      // 1. Upload Logic
      addLog("📂 آپلود فایل‌ها...");
      const finalUrls = {
        main: files.main ? await api.uploadFile(files.main, codeFolder, bucket) : existingUrls.main,
        black: files.black ? await api.uploadFile(files.black, codeFolder, bucket) : existingUrls.black,
        white: files.white ? await api.uploadFile(files.white, codeFolder, bucket) : existingUrls.white,
        pdf: files.pdf ? await api.uploadFile(files.pdf, codeFolder, bucket) : existingUrls.pdf,
      };

      let productId = editId;
      const productData = {
        name: data.name, code_liner: data.code_liner, category: data.category, short_description: data.short_description || '', no_pricing: data.no_pricing || '',
        is_active: data.is_active === 'true', Custom_design: data.Custom_design === 'true', active_body_color: data.active_body_color === 'true', active_light_type: data.active_light_type === 'true',
        image_url: finalUrls.main, image_black_url: finalUrls.black, image_white_url: finalUrls.white, Pdf_url: finalUrls.pdf
      };

      // 2. Parent Operation
      if (mode === 'CREATE') {
         addLog("💾 ایجاد محصول جدید...");
         const res = await api.createProduct(productData);
         productId = res.id;
      } else if (mode === 'EDIT' && productId) {
         addLog("💾 بروزرسانی محصول اصلی...");
         await api.updateProduct(productId, productData);
         addLog("🧹 حذف داده‌های قدیمی (فرزندان)...");
         await api.deleteProductChildren(productId);
      }

      if (!productId) throw new Error("Product ID not found");

      // 3. Child Operations
      addLog("💾 ذخیره مشخصات (Specs)...");
      await api.createSpecs({ ...data.specs, product_id: productId, dimensions: data.specs.dimensions || '', inset_cut_dimensions: data.specs.inset_cut_dimensions || '', row_in_liner: data.specs.row_in_liner || '', body_material: data.specs.body_material || '', main_usage: data.specs.main_usage || '', installation_type: data.specs.installation_type || '', installation_method: data.specs.installation_method || '', notes: data.specs.notes || '', ertafa_saqf: data.specs.ertafa_saqf || '' });

      const newGalleryUrls = [];
      for (const f of files.gallery) newGalleryUrls.push(await api.uploadFile(f, codeFolder, bucket));
      const allGalleryUrls = [...existingUrls.gallery, ...newGalleryUrls];
      addLog(`💾 ذخیره گالری (${allGalleryUrls.length})...`);
      await api.createProductGalleryBatch(allGalleryUrls.map((url, i) => ({ product_id: productId!, image_url: url, sort_order: i + 1 })));

      addLog("💾 ذخیره قیمت‌ها و مپینگ داده‌ها...");
      const pricingRows = await api.createPricingBatch(data.pricing.map(p => ({
        ...p,
        product_id: productId!,
        IP65: p.ip65 === 'true', // MAP TO DB UPPERCASE
        IP20: p.ip20 === 'true', // MAP TO DB UPPERCASE
        "3Color": p.three_color,
        RGB: p.rgb,
        tage: p.tage || '', spase_recommend: p.spase_recommend || '', dimer: p.dimer || '', suitable_for: p.suitable_for || '', longevity: p.longevity || '', lumen: p.lumen || 0, w_per_meter: p.w_per_meter || '', power_source: p.power_source || '', row_in_liner: p.row_in_liner || ''
      })));

      addLog("💾 ذخیره رنگ‌ها و سوالات...");
      const colorRows = await api.createBodyColorsBatch(data.body_colors.map(c => ({ ...c, product_id: productId! })));
      await api.createFAQBatch(data.faqs.map((f, i) => ({ product_id: productId!, question: f.question, answer: f.answer, code_liner: f.code_liner, sort: i + 1 })));
      await api.createFAQSalesBatch(data.faq_sales.map((f, i) => ({ product_id: productId!, question: f.question, answer: f.answer, code_liner: f.code_liner, sort: i + 1 })));

      // 4. Inventory
      addLog("⚙️ تولید انبار (Cartesian Product)...");
      const inv: DbProductInventory[] = [];
      const lightsToUse = data.light_type_values;
      
      for (const p of pricingRows) {
        for (const c of colorRows) {
          for (const l of lightsToUse) {
            const lid = findLightTypeId(lightTypes, l);
            inv.push({
              product_id: productId!, pricing_id: p.id, body_color_id: c.id, light_type_id: lid, stock_qty: 0,
              status: 'موجود', status_pricing_model: 'موجود', status_body_color: 'موجود', status_light_type: 'موجود',
              code_liner: data.code_liner, model_name: p.model_name, body_Color: c.name, light_type: LIGHT_TYPE_INVENTORY_LABEL[l] || l
            });
          }
        }
      }
      if (inv.length > 0) await api.createInventoryBatch(inv);

      addLog("✅ موفقیت‌آمیز بود!");
      await new Promise(r => setTimeout(r, 1000));
      onSuccess();
    } catch (e: any) {
      console.error(e);
      // Safer error parsing to avoid [object Object]
      const errString = e?.message || JSON.stringify(e);
      
      if (errString.includes("products_code_liner_key") || errString.includes("duplicate key")) {
        alert("خطا: این کد لاینر قبلاً ثبت شده است.");
        setStep(1); // Go back to start
      } else {
        addLog(`❌ خطا: ${e.message || "Unknown Error"}`);
      }
    } finally { setSubmitting(false); }
  };

  const next = async () => {
    let ok = false;
    if (step===1) ok = await trigger(['name', 'code_liner', 'category']);
    else if (step===2) ok = await trigger(['specs']);
    else if (step===3) ok = true;
    else if (step===4) ok = await trigger(['pricing']);
    else if (step===5) ok = await trigger(['body_colors']);
    else if (step===6) ok = await trigger(['faqs', 'faq_sales']);
    
    if (ok) setStep(s => s + 1);
    else alert("لطفاً خطاهای این مرحله را بررسی کنید.");
  };

  if (loadingData) return <div className="p-20 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-slate-400" /></div>;

  return (
    <Card className="border-t-4 border-t-slate-900 shadow-xl">
      <CardHeader><CardTitle className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">{step}</div>{mode === 'CREATE' ? "افزودن محصول جدید" : `ویرایش: ${editId}`}</CardTitle></CardHeader>
      <CardContent className="min-h-[500px]">
        {/* STEP 1: INFO */}
        <div className={cn("space-y-6", step===1?"block":"hidden")}>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>نام محصول</Label><Input {...register("name")} />{errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}</div>
                <div className="space-y-2"><Label>کد لاینر</Label><Input {...register("code_liner")} className="dir-ltr text-left font-mono" />{errors.code_liner && <span className="text-red-500 text-xs">{errors.code_liner.message}</span>}</div>
                <div className="space-y-2"><Label>دسته بندی</Label><Input {...register("category")} /></div>
                <div className="space-y-2"><Label>توضیحات کوتاه</Label><Textarea {...register("short_description")} /></div>
                <div className="md:col-span-2 space-y-2"><Label>توضیحات (بدون قیمت)</Label><Input {...register("no_pricing")} /></div>
             </div>
             <div className="bg-slate-50 p-4 rounded grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="space-y-1"><Label>وضعیت محصول</Label><NativeSelect {...register("is_active")}><option value="true">فعال</option><option value="false">غیرفعال</option></NativeSelect></div>
               <div className="space-y-1"><Label>وضعیت طراحی سفارشی</Label><NativeSelect {...register("Custom_design")}><option value="false">غیرفعال</option><option value="true">فعال</option></NativeSelect></div>
               <div className="space-y-1"><Label>وضعیت انتخاب رنگ بدنه</Label><NativeSelect {...register("active_body_color")}><option value="true">فعال</option><option value="false">غیرفعال</option></NativeSelect></div>
               <div className="space-y-1"><Label>وضعیت انتخاب نوع نور</Label><NativeSelect {...register("active_light_type")}><option value="true">فعال</option><option value="false">غیرفعال</option></NativeSelect></div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FileUploadZone label="تصویر اصلی" accept={{'image/*': []}} currentFile={files.main} existingUrl={existingUrls.main} onFileSelect={f=>setFiles(p=>({...p,main:f}))} onRemove={()=>{setFiles(p=>({...p,main:null})); setExistingUrls(p=>({...p,main:''}))}} />
                <FileUploadZone label="تصویر مشکی" accept={{'image/*': []}} currentFile={files.black} existingUrl={existingUrls.black} onFileSelect={f=>setFiles(p=>({...p,black:f}))} onRemove={()=>{setFiles(p=>({...p,black:null})); setExistingUrls(p=>({...p,black:''}))}} />
                <FileUploadZone label="تصویر سفید" accept={{'image/*': []}} currentFile={files.white} existingUrl={existingUrls.white} onFileSelect={f=>setFiles(p=>({...p,white:f}))} onRemove={()=>{setFiles(p=>({...p,white:null})); setExistingUrls(p=>({...p,white:''}))}} />
                <FileUploadZone label="فایل PDF" accept={{'application/pdf': ['.pdf']}} currentFile={files.pdf} existingUrl={existingUrls.pdf} onFileSelect={f=>setFiles(p=>({...p,pdf:f}))} onRemove={()=>{setFiles(p=>({...p,pdf:null})); setExistingUrls(p=>({...p,pdf:''}))}} />
             </div>
        </div>

        {/* STEP 2: SPECS */}
        <div className={cn("space-y-6", step===2?"block":"hidden")}>
             <div className="grid md:grid-cols-3 gap-6">
               <div className="space-y-2"><Label>کد لاینر (مشخصات)</Label><Controller control={control} name="specs.code_liner" render={({ field }) => (<CreatableCombobox options={GENERATE_LINER_CODES()} value={field.value} onChange={field.onChange} placeholder="انتخاب..." />)} /></div>
               <div className="space-y-2"><Label>ابعاد محصول</Label><Input {...register("specs.dimensions")} /></div>
               <div className="space-y-2"><Label>ابعاد برش</Label><Input {...register("specs.inset_cut_dimensions")} /></div>
               <div className="space-y-2"><Label>تعداد ردیف نوری</Label><Input {...register("specs.row_in_liner")} /></div>
               <div className="space-y-2"><Label>جنس بدنه</Label><Input {...register("specs.body_material")} /></div>
               <div className="space-y-2"><Label>محل استفاده اصلی</Label><Input {...register("specs.main_usage")} /></div>
               <div className="space-y-2"><Label>نوع نصب</Label><Input {...register("specs.installation_type")} /></div>
               <div className="space-y-2"><Label>روش نصب</Label><Input {...register("specs.installation_method")} /></div>
               <div className="space-y-2"><Label>ارتفاع سقف مناسب</Label><Input {...register("specs.ertafa_saqf")} /></div>
               <div className="space-y-2 md:col-span-3"><Label>توضیحات نصب</Label><Textarea {...register("specs.notes")} /></div>
             </div>
        </div>

        {/* STEP 3: GALLERY */}
        <div className={cn("space-y-6", step===3?"block":"hidden")}>
             <MultiFileDropzone 
                onFilesAdded={newFiles => setFiles(prev => ({ ...prev, gallery: [...prev.gallery, ...newFiles] }))}
                currentFiles={files.gallery}
                existingUrls={existingUrls.gallery}
                onRemoveNew={(idx) => setFiles(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }))}
                onRemoveExisting={(idx) => setExistingUrls(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }))}
             />
        </div>

        {/* STEP 4: PRICING */}
        <div className={cn("space-y-6", step===4?"block":"hidden")}>
             {pricingFields.map((field, index) => (
                <Card key={field.id} className="relative overflow-visible bg-slate-50/50">
                   <div className="absolute -top-3 right-4 bg-slate-900 text-white px-2 text-xs font-bold rounded">مدل {index + 1}</div>
                   <CardContent className="p-4 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1"><Label>نام مدل فارسی</Label><Input {...register(`pricing.${index}.model_name`)} /></div>
                      <div className="space-y-1"><Label>کد لاینر (قیمت)</Label><Controller control={control} name={`pricing.${index}.pricing_code_liner`} render={({ field }) => (<CreatableCombobox options={GENERATE_LINER_CODES()} value={field.value} onChange={field.onChange} placeholder="..." />)} /></div>
                      <div className="space-y-1"><Label>قیمت</Label><Input type="number" {...register(`pricing.${index}.price_per_meter`, {valueAsNumber: true})} /></div>
                      <div className="space-y-1"><Label>گارانتی (ماه)</Label><Input type="number" {...register(`pricing.${index}.warranty_months`, {valueAsNumber:true})} /></div>
                      
                      <div className="space-y-1"><Label>منبع نوری (تایتل)</Label><Input {...register(`pricing.${index}.light`)} /></div>
                      <div className="space-y-1"><Label>منبع نوری (فارسی)</Label><NativeSelect {...register(`pricing.${index}.light_source_persion`)}>{["ریسه 24 ولت", "ریسه 300 میلی آمپر", "ماژول 300 میلی آمپر", "ریسه 12 ولت", "ریسه 220 ولت"].map(o => <option key={o} value={o}>{o}</option>)}</NativeSelect></div>
                      <div className="space-y-1"><Label>سورس نور (کد)</Label><NativeSelect {...register(`pricing.${index}.light_source`)}>{["V24", "V12", "V220", "STRIP300", "MODULE300", "RGB", "TRI"].map(o => <option key={o} value={o}>{o}</option>)}</NativeSelect></div>
                      <div className="space-y-1"><Label>تراکم</Label><NativeSelect {...register(`pricing.${index}.density`)}>{["240", "120", "60"].map(o => <option key={o} value={o}>{o}</option>)}</NativeSelect></div>
                      
                      <div className="space-y-1"><Label>وضعیت 3 حالته</Label><NativeSelect {...register(`pricing.${index}.three_color`)}><option value="ناموجود">ناموجود</option><option value="No">No</option><option value="3Color">3Color</option></NativeSelect></div>
                      <div className="space-y-1"><Label>وضعیت RGB</Label><NativeSelect {...register(`pricing.${index}.rgb`)}><option value="ناموجود">ناموجود</option><option value="No">No</option><option value="RGB">RGB</option></NativeSelect></div>
                      <div className="space-y-1"><Label>کلید مدل</Label><NativeSelect {...register(`pricing.${index}.model_key`)}>{Object.values(PricingModelKey).map(k => <option key={k} value={k}>{k}</option>)}</NativeSelect></div>
                      
                      <div className="space-y-1"><Label>استاندارد IP65</Label><NativeSelect {...register(`pricing.${index}.ip65`)}><option value="false">ندارد</option><option value="true">دارد</option></NativeSelect></div>
                      <div className="space-y-1"><Label>استاندارد IP20</Label><NativeSelect {...register(`pricing.${index}.ip20`)}><option value="true">دارد</option><option value="false">ندارد</option></NativeSelect></div>

                      {/* --- MISSING INTERMEDIATE FIELDS --- */}
                      <div className="space-y-1"><Label>تگ (Tage)</Label><Input {...register(`pricing.${index}.tage`)} /></div>
                      <div className="space-y-1"><Label>فضای پیشنهادی</Label><Input {...register(`pricing.${index}.spase_recommend`)} /></div>
                      <div className="space-y-1"><Label>دیمر</Label><Input {...register(`pricing.${index}.dimer`)} /></div>

                      {/* --- SUITABLE FOR (Textarea) --- */}
                      <div className="col-span-2 md:col-span-4 space-y-1">
                           <Label>توضیحات مدل (مناسب برای)</Label>
                           <Textarea {...register(`pricing.${index}.suitable_for`)} placeholder="توضیحات..." />
                      </div>

                      {/* --- RESTORED 5 MISSING TECHNICAL FIELDS --- */}
                      <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-slate-200 mt-2">
                         <div className="space-y-1"><Label>طول عمر</Label><Input {...register(`pricing.${index}.longevity`)} /></div>
                         <div className="space-y-1"><Label>شار نوری (Lumen)</Label><Input type="number" {...register(`pricing.${index}.lumen`, {valueAsNumber:true})} /></div>
                         <div className="space-y-1"><Label>توان (وات بر متر)</Label><Input {...register(`pricing.${index}.w_per_meter`)} /></div>
                         <div className="space-y-1"><Label>منبع تغذیه</Label><Input {...register(`pricing.${index}.power_source`)} /></div>
                         <div className="space-y-1"><Label>تعداد ردیف نوری</Label><Input {...register(`pricing.${index}.row_in_liner`)} /></div>
                      </div>

                   </CardContent>
                   <CardFooter className="p-2 border-t flex justify-end"><Button variant="destructive" size="sm" onClick={() => removePricing(index)}><Trash2 size={12}/> حذف</Button></CardFooter>
                </Card>
             ))}
             <Button variant="outline" onClick={() => appendPricing({ model_name: 'مدل جدید', price_per_meter: 0, model_key: PricingModelKey.ECO, warranty_months: 12, light: '', light_source_persion: '', light_source: '', density: '120', three_color: 'No', rgb: 'No', ip65: "false", ip20: "true", pricing_code_liner: '' })} className="w-full border-dashed"><Plus size={16}/> افزودن مدل</Button>
        </div>

        {/* STEP 5: COLORS */}
        <div className={cn("space-y-6", step===5?"block":"hidden")}>
             {colorFields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end border p-4 rounded bg-slate-50">
                   <div className="flex-1 space-y-1"><Label>نام رنگ</Label><Input {...register(`body_colors.${index}.name`)} /></div>
                   <div className="flex-1 space-y-1"><Label>کلید رنگ</Label><NativeSelect {...register(`body_colors.${index}.key`)}><option value="white_glossy">سفید</option><option value="black_matte">مشکی</option></NativeSelect></div>
                   <div className="w-24 space-y-1"><Label>موجودی اولیه</Label><Input type="number" {...register(`body_colors.${index}.initial_stock`, {valueAsNumber:true})} /></div>
                   <Button variant="destructive" size="icon" onClick={() => removeColor(index)}><Trash2 size={16}/></Button>
                </div>
             ))}
             <Button variant="outline" onClick={() => appendColor({ name: '', key: 'white_glossy', initial_stock: 0 })} className="w-full border-dashed"><Plus size={16}/> رنگ جدید</Button>
        </div>

        {/* STEP 6: FAQS */}
        <div className={cn("space-y-6", step===6?"block":"hidden")}>
             {faqFields.map((field, i) => ( 
                <div key={field.id} className="border p-3 rounded space-y-2">
                  <div className="flex gap-2">
                     <Input placeholder="سوال" {...register(`faqs.${i}.question`)} />
                     <Button variant="ghost" onClick={()=>removeFaq(i)} className="text-red-500"><Trash2 size={16}/></Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                         <Controller control={control} name={`faqs.${i}.code_liner`} render={({ field }) => (<CreatableCombobox options={GENERATE_LINER_CODES()} value={field.value} onChange={field.onChange} placeholder="کد لاینر (خودکار)" />)} />
                         {errors.faqs?.[i]?.code_liner && <p className="text-xs text-red-500">کد لاینر الزامی است</p>}
                      </div>
                      <Textarea placeholder="پاسخ" {...register(`faqs.${i}.answer`)} />
                  </div>
                </div> 
             ))}
             <Button variant="outline" onClick={() => appendFaq({question:'', answer:'', code_liner: getValues('code_liner') || '' })} className="w-full text-indigo-600 border-indigo-200"><Plus size={14}/> افزودن سوال (FAQ)</Button>

             <div className="border-t pt-4">
               <h4 className="font-bold mb-2">سوالات فروش (FAQsales)</h4>
               {faqSalesFields.map((field, i) => ( 
                  <div key={field.id} className="border p-3 rounded space-y-2 mb-2">
                    <div className="flex gap-2">
                       <Input placeholder="سوال" {...register(`faq_sales.${i}.question`)} />
                       <Button variant="ghost" onClick={()=>removeFaqSales(i)} className="text-red-500"><Trash2 size={16}/></Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                           <Controller control={control} name={`faq_sales.${i}.code_liner`} render={({ field }) => (<CreatableCombobox options={GENERATE_LINER_CODES()} value={field.value} onChange={field.onChange} placeholder="کد لاینر (خودکار)" />)} />
                        </div>
                        <Textarea placeholder="پاسخ" {...register(`faq_sales.${i}.answer`)} />
                    </div>
                  </div> 
               ))}
               <Button variant="outline" onClick={() => appendFaqSales({question:'', answer:'', code_liner: getValues('code_liner') || '' })} className="w-full text-emerald-600 border-emerald-200"><Plus size={14}/> افزودن سوال فروش</Button>
             </div>
        </div>

        {/* STEP 7: INVENTORY */}
        <div className={cn("space-y-6", step===7?"block":"hidden")}>
             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
               <h3 className="font-bold text-blue-800 mb-4">نورهای قابل پشتیبانی</h3>
               <div className="grid grid-cols-3 gap-4">
                 {[{v:'natural',l:'نچرال'},{v:'warm',l:'آفتابی'},{v:'cool',l:'سفید'},{v:'rgb',l:'RGB'},{v:'tri',l:'3 حالته'}].map(o => (
                   <Controller key={o.v} control={control} name="light_type_values" render={({field}) => {
                     const checked = field.value.includes(o.v);
                     return <div onClick={() => checked ? field.onChange(field.value.filter(x=>x!==o.v)) : field.onChange([...field.value, o.v])} className={cn("flex items-center gap-2 p-3 rounded border cursor-pointer bg-white", checked && "border-blue-500 ring-1 ring-blue-500")}><div className={cn("w-4 h-4 border rounded flex items-center justify-center", checked && "bg-blue-500 border-blue-500")}>{checked && <Check size={12} className="text-white"/>}</div><span>{o.l}</span></div>
                   }} />
                 ))}
               </div>
             </div>
        </div>

      </CardContent>
      <CardFooter className="flex justify-between border-t p-6 bg-slate-50">
          <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(s=>s-1)}>{step === 1 ? "انصراف" : "مرحله قبل"}</Button>
          {step < 7 ? <Button onClick={next}>مرحله بعد</Button> : <Button onClick={handleSubmit(onSubmit, onError)} className="bg-green-600 w-48">{submitting ? <Loader2 className="animate-spin" /> : (mode === 'CREATE' ? "ثبت نهایی" : "ذخیره تغییرات")}</Button>}
      </CardFooter>
      {submitting && <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-slate-900 text-green-400 font-mono p-6 rounded w-full max-w-lg h-64 overflow-auto border border-green-900/50 shadow-2xl">{logs.map((l,i)=><div key={i} className="mb-1">{l}</div>)}</div></div>}
    </Card>
  );
}