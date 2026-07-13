import type { NewsDto, NewsRepository } from "@/server/domain/news";
import {
  err,
  notFound,
  ok,
  unexpected,
  type Result,
} from "@/server/domain/result";

export async function listNews(
  repo: NewsRepository,
): Promise<Result<NewsDto[]>> {
  try {
    return ok(await repo.list());
  } catch {
    return err(unexpected("Nepodařilo se načíst aktuality."));
  }
}

export async function getNews(
  repo: NewsRepository,
  id: string,
): Promise<Result<NewsDto>> {
  try {
    const news = await repo.getById(id);
    if (!news) return err(notFound("Aktualita nebyla nalezena."));
    return ok(news);
  } catch {
    return err(unexpected("Nepodařilo se načíst aktualitu."));
  }
}
