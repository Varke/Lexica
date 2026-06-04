/**
 * PostgREST (Supabase) отдаёт максимум 1000 строк за запрос (db-max-rows).
 * Этот помощник постранично дочитывает все строки через .range(), чтобы
 * статистика и счётчики не «застревали» на 1000 при больших колодах.
 *
 * `build` должен применять .range(from, to) к билдеру и вернуть его —
 * фильтры/сортировку задавайте внутри фабрики.
 */
const PAGE = 1000;

type RangeResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export async function fetchAll<T>(
  build: (from: number, to: number) => RangeResult<T>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}
