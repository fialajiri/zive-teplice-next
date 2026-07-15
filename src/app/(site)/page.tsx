import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Music2, Palette, UtensilsCrossed, Users } from "lucide-react";
import { container } from "@/server/container";
import { listNews } from "@/server/application/news";
import { getCurrentEvent } from "@/server/application/events";
import { getRegistrationOpen } from "@/server/application/settings";
import { NewsCard } from "@/components/site/news-card";
import { buttonVariants } from "@/components/ui/button";
import type { EventDto } from "@/server/domain/event";

// Always server-rendered so admin changes appear immediately (no ISR window).
export const dynamic = "force-dynamic";

const INTRO_HIGHLIGHTS = [
  {
    icon: Music2,
    title: "Hudba naživo",
    description: "Vystoupení místních kapel a umělců po celý den.",
  },
  {
    icon: UtensilsCrossed,
    title: "Občerstvení",
    description: "Dobroty od místních stánkařů a kavárníků.",
  },
  {
    icon: Palette,
    title: "Tvorba a trh",
    description: "Výstava obrazů a trh s autorskými výrobky.",
  },
  {
    icon: Users,
    title: "Pro celou rodinu",
    description: "Divadlo, jóga a program pro děti i dospělé.",
  },
] as const;

// Not async: the hero image (LCP) and static sections must be part of the
// initial flushed HTML. Only the data-dependent slivers below suspend, each
// with a fallback close enough in shape to the resolved content to avoid
// layout shift — see docs/plans/phase-7-backlog.md perf notes.
export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl sm:aspect-[16/9]">
        <Image
          src="/hero/festival-2024.jpg"
          alt="Kapela hraje na pódiu u Mušle v Šanovském parku před davem návštěvníků festivalu Živé Teplice"
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        />
        <div className="relative flex flex-col items-start gap-5 p-6 sm:p-10">
          <h1 className="font-heading text-4xl text-balance text-white sm:text-6xl">
            Živé Teplice
          </h1>
          <Suspense
            fallback={<HeroCta currentEvent={null} registrationOpen={false} />}
          >
            <HeroCtaSection />
          </Suspense>
        </div>
      </section>

      <section
        aria-labelledby="home-about-heading"
        className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center"
      >
        <div className="flex flex-col gap-6 lg:order-1">
          <div className="flex flex-col gap-3">
            <h2 id="home-about-heading" className="font-heading text-2xl">
              O festivalu
            </h2>
            <p className="text-muted-foreground max-w-3xl text-pretty">
              Sousedská slavnost Živé Teplice podporuje komunitní život v
              Teplicích a snaží se propojovat lidi různých věkových, názorových
              i národnostních skupin. Jednoduše spojuje všechny, kteří si chtějí
              zpříjemnit život v našem městě a trochu ho oživit. Každoročně se
              můžete těšit na hudební vystoupení místních umělců, výborné
              občerstvení, výstavu obrazů, divadlo, program neziskových spolků,
              trh s autorskými výrobky i jógu.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {INTRO_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex flex-col gap-2">
                <item.icon
                  aria-hidden="true"
                  className="text-primary size-7"
                  strokeWidth={1.75}
                />
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-muted relative aspect-4/5 overflow-hidden rounded-2xl">
          <Image
            src="/hero/festival-2025.jpg"
            alt="Hudebník s kytarou hraje dětem v publiku na festivalu Živé Teplice"
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <Suspense fallback={<LatestNewsSkeleton />}>
        <LatestNewsSection />
      </Suspense>
    </div>
  );
}

function HeroCta({
  currentEvent,
  registrationOpen,
}: {
  currentEvent: EventDto | null;
  registrationOpen: boolean;
}) {
  return (
    <>
      <p className="max-w-2xl text-lg text-balance text-white/90">
        {currentEvent
          ? `Sousedská slavnost v Šanovském parku u Mušle. Aktuální ročník: ${currentEvent.title} (${currentEvent.year}).`
          : "Sousedská slavnost v Šanovském parku u Mušle, Teplice."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/program" className={buttonVariants({ size: "lg" })}>
          Program
        </Link>
        <Link
          href="/galerie"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Galerie
        </Link>
        {registrationOpen ? (
          <Link
            href="/registrace"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Registrace účinkujících
          </Link>
        ) : null}
      </div>
    </>
  );
}

async function HeroCtaSection() {
  const [eventResult, registrationOpen] = await Promise.all([
    getCurrentEvent(container.eventRepository),
    getRegistrationOpen(container.settingsRepository),
  ]);
  const currentEvent = eventResult.ok ? eventResult.value : null;

  return (
    <HeroCta currentEvent={currentEvent} registrationOpen={registrationOpen} />
  );
}

async function LatestNewsSection() {
  const newsResult = await listNews(container.newsRepository);
  const latestNews = newsResult.ok ? newsResult.value.slice(0, 3) : [];

  if (latestNews.length === 0) return null;

  return (
    <section aria-labelledby="home-news-heading">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="home-news-heading" className="font-heading text-2xl">
          Nejnovější aktuality
        </h2>
        <Link
          href="/aktuality"
          className="text-primary text-sm hover:underline"
        >
          Všechny aktuality
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {latestNews.map((news) => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>
    </section>
  );
}

function LatestNewsSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        <div className="bg-muted h-4 w-28 animate-pulse rounded-md" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border/60 overflow-hidden rounded-xl border"
          >
            <div className="bg-muted aspect-[16/9] animate-pulse" />
            <div className="flex flex-col gap-2 p-5">
              <div className="bg-muted h-3 w-20 animate-pulse rounded" />
              <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
