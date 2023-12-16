/** @format */
import HeroGallery from '@/components/home/hero-gallery';
import HeroSection from '@/components/home/hero-section';
import HeroSupport from '@/components/home/hero-support';
import HeroYearSummary from '@/components/home/hero-year-summary';

export default function Home() {
  return (
    <main>
      <HeroGallery />
      <HeroSection />
      <HeroSupport />
      <HeroYearSummary year='2023' heading='Živé Teplice 2023' />
      <HeroYearSummary year='2022' heading='Živé Teplice 2022' />
      <HeroYearSummary year='2021-muzeum' heading='Živé Teplice 2021 v Muzeu' />
      <HeroYearSummary year='2021' heading='Živé Teplice 2021' />
      <HeroYearSummary year='2020' heading='Živé Teplice 2020' />
      <HeroYearSummary year='2019' heading='Živé Teplice 2019' />
      <HeroYearSummary year='2018' heading='Živé Teplice 2018' />
      <HeroYearSummary year='2017' heading='Živé Teplice 2017' />
      <HeroYearSummary year='2016' heading='Živé Teplice 2016' />
    </main>
  );
}
