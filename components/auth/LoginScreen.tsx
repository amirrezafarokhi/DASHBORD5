import React, { useState, useEffect } from 'react';
import { LogIn, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Label, 
  Input, 
  Button 
} from '../ui/Primitives';
import { supabase } from '../../lib/supabaseClient';

/* -------------------- ارقام فارسی/عربی → لاتین -------------------- */
function toLatinDigits(str: string) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return String(str || "")
    .split("")
    .map((ch) => {
      const fi = fa.indexOf(ch);
      if (fi > -1) return String(fi);
      const ai = ar.indexOf(ch);
      if (ai > -1) return String(ai);
      return ch;
    })
    .join("");
}

/* -------------------- نرمال‌سازی موبایل ایران -------------------- */
function toLocalMobile(input: string) {
  // خروجی: 0912xxxxxxx
  const d = toLatinDigits(input).replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("09") && d.length === 11) return d;
  if (d.startsWith("9") && d.length === 10) return "0" + d;
  if (d.startsWith("98") && d.length === 12) return "0" + d.slice(2);
  return d;
}

function toE164IR(input: string) {
  // خروجی: +98912xxxxxxx
  const local = toLocalMobile(input);
  if (/^09\d{9}$/.test(local)) return "+98" + local.slice(1);
  const s = toLatinDigits(input).replace(/\s|-/g, "");
  if (s.startsWith("+98") && s.length === 13) return s;
  return "";
}

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState(""); // ایمیل/موبایل/نام‌کاربری
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // راست‌به‌چپ و زبان
  useEffect(() => {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "fa");
  }, []);

  async function signInEmail(email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data?.user ?? null;
  }

  async function signInPhone(phone: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ phone, password: pass });
    if (error) throw error;
    return data?.user ?? null;
  }

  async function resolveEmailFromSingSignup(idLike: string) {
    // تلاش بر اساس شماره و نام‌کاربری برای پیدا کردن ایمیل
    const local = toLocalMobile(idLike);
    if (/^09\d{9}$/.test(local)) {
      const { data } = await supabase
        .from("sing_singup")
        .select('auth_user_id, "Email"')
        .eq("phone_number", local)
        .maybeSingle();
      if (data?.Email) return String(data.Email);
    }
    const { data } = await supabase
      .from("sing_singup")
      .select('auth_user_id, "Email"')
      .eq("Username", idLike)
      .maybeSingle();
    if (data?.Email) return String(data.Email);
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const raw = (identifier || "").trim();
      if (!raw) throw new Error("ایمیل/موبایل/نام‌کاربری را وارد کنید.");
      if (!password) throw new Error("رمز عبور را وارد کنید.");

      let user: any = null;

      if (raw.includes("@")) {
        // 1) ایمیل مستقیم
        user = await signInEmail(raw, password);
      } else {
        // 2) موبایل: هر دو فرمت را امتحان می‌کنیم
        const e164 = toE164IR(raw);      // +98912…
        const local = toLocalMobile(raw); // 0912…
        let phoneTried = false;
        if (e164) {
          phoneTried = true;
          try { user = await signInPhone(e164, password); } catch {}
        }
        if (!user && /^09\d{9}$/.test(local)) {
          phoneTried = true;
          try { user = await signInPhone(local, password); } catch {}
        }
        // 3) اگر با موبایل نشد، از sing_singup ایمیل را resolve کن و با ایمیل وارد شو
        if (!user) {
          const email = await resolveEmailFromSingSignup(raw);
          if (!email) throw new Error(phoneTried ? "نام کاربری/شماره یا رمز اشتباه است." : "کاربری یافت نشد.");
          user = await signInEmail(email, password);
        }
      }

      if (!user) throw new Error("ورود ناموفق بود.");

      // بررسی نقش/فعال‌بودن در sing_singup
      const { data: ap, error: apErr } = await supabase
        .from("sing_singup")
        .select("role,is_active")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (apErr) throw apErr;
      if (!ap) {
        await supabase.auth.signOut();
        throw new Error("حساب شما در لیست دسترسی مدیران ثبت نشده است.");
      }
      if (!ap.is_active) {
        await supabase.auth.signOut();
        throw new Error("دسترسی مدیر شما غیرفعال است.");
      }

      // ثبت زمان آخرین ورود
      await supabase
        .from("sing_singup")
        .update({ last_login: new Date().toISOString() })
        .eq("auth_user_id", user.id);

      onLoginSuccess();
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/invalid login credentials/i.test(msg)) {
        setError("نام کاربری/شماره یا رمز اشتباه است.");
      } else if (/email not confirmed|not confirmed/i.test(msg)) {
        setError("ایمیل شما تایید نشده است.");
      } else if (/phone not confirmed|sms|otp/i.test(msg)) {
        setError("لاگین با موبایل نیازمند تایید شماره یا تنظیم گذرواژه است.");
      } else {
        setError(msg || "خطای غیرمنتظره رخ داد.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-slate-900 bg-white">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-slate-900 rounded-lg mx-auto flex items-center justify-center text-white mb-4">
             <LogIn />
          </div>
          <CardTitle>ورود مدیر</CardTitle>
          <p className="text-xs text-slate-400 mt-2">ایمیل، شماره موبایل یا نام‌کاربری و رمز عبور را وارد کنید</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>ایمیل / موبایل / نام‌کاربری</Label>
              <Input 
                placeholder="example@mail.com | 0912… | username" 
                className="dir-ltr text-left font-mono"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور</Label>
              <div className="relative">
                <Input 
                  type={showPass ? "text" : "password"}
                  placeholder="******" 
                  className="dir-ltr text-left pr-10" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  title={showPass ? "مخفی کردن" : "نمایش"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-md flex items-center gap-2 font-medium">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "ورود"}
            </Button>

            <p className="text-xs text-slate-400 leading-5 mt-2 text-center">
              اگر با موبایل وارد نمی‌شوید، مطمئن شوید Phone Auth در Supabase فعال است و
              برای حساب‌تان گذرواژه تنظیم شده است.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}