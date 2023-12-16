
/** @format */
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { redirect } from 'next/navigation';
import Login from '@/components/login';
import HeroGallery from '@/components/home/hero-gallery';
import HeroSection from '@/components/home/hero-section';
import HeroSupport from '@/components/home/hero-support';
import HeroSummaryGallery from '@/components/home/hero-summary-gallery';
import HeroYearSummary from '@/components/home/hero-year-summary';

export default function Home() {  

  return (
    <main>
      <HeroGallery />
      <HeroSection />
      <HeroSupport />
      <HeroYearSummary year="2021-muzeum" heading="Živé Teplice 2021 v Muzeu" />
    </main>
  );
}
