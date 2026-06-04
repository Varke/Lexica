"use client"; // Error boundary должен быть клиентским компонентом.

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Глобальный fallback для непойманных ошибок рендеринга страниц.
 * Оборачивает всё ниже корневого layout (сам root layout не покрывает —
 * для него нужен global-error.tsx).
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO: подключить внешний error reporting (Sentry и т.п.) для прода.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h2 className="text-2xl font-semibold">Что-то пошло не так</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Произошла ошибка. Попробуйте ещё раз — если повторяется, перезагрузите
        страницу.
      </p>
      <Button onClick={() => unstable_retry()}>Попробовать снова</Button>
    </main>
  );
}
