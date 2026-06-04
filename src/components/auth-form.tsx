"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const isLogin = mode === "login";

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) throw error;
        toast.success("С возвращением!");
      } else {
        const { data, error } = await supabase.auth.signUp(values);
        if (error) throw error;
        // Если включено подтверждение email — сессии ещё нет.
        if (!data.session) {
          toast.success("Аккаунт создан. Проверьте почту для подтверждения.");
          router.push("/login");
          return;
        }
        toast.success("Аккаунт создан!");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isLogin ? "Вход" : "Регистрация"}
        </CardTitle>
        <CardDescription>
          {isLogin
            ? "Войдите, чтобы продолжить учить слова"
            : "Создайте аккаунт, чтобы начать"}
        </CardDescription>
      </CardHeader>
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
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Подождите…" : isLogin ? "Войти" : "Зарегистрироваться"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isLogin ? "Регистрация" : "Вход"}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
