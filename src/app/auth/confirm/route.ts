import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Обработчик ссылки из письма подтверждения / сброса пароля.
 *
 * Supabase шлёт пользователю ссылку вида
 *   {SITE_URL}/auth/confirm?token_hash=...&type=signup&next=/dashboard
 * (нужно один раз поправить шаблоны писем в Dashboard → Authentication → Emails,
 *  заменив {{ .ConfirmationURL }} на
 *  {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}).
 *
 * verifyOtp под капотом выставляет cookie-сессию через server-клиент,
 * после чего пользователь сразу залогинен.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Только относительные пути — защита от open redirect.
      const dest = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // Невалидная или просроченная ссылка → на логин с пометкой об ошибке.
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "auth_confirm_failed");
  return NextResponse.redirect(url);
}
