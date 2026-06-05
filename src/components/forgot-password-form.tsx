"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/confirm`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить письмо");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Сброс пароля</CardTitle>
        <CardDescription>
          {sent
            ? "Если такой аккаунт есть, мы отправили ссылку для сброса пароля."
            : "Введите email — пришлём ссылку для смены пароля."}
        </CardDescription>
      </CardHeader>

      {sent ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Проверьте почту и перейдите по ссылке. Не пришло — проверьте папку
            «Спам» или попробуйте ещё раз через минуту.
          </p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправляем…" : "Отправить ссылку"}
            </Button>
          </CardFooter>
        </form>
      )}

      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Вспомнили пароль?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Вход
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
