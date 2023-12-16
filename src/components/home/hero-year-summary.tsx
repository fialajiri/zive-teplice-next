/** @format */

import SummaryGallery from './hero-summary-gallery';

interface HeroYearSummaryProps {
  flip: boolean;
  year: number | string;
  heading: string;
}

export default function HeroYearSummary({ flip, year, heading }: HeroYearSummaryProps) {
  return (
    <section className={`section__summary ${flip === true ? 'section__summary--flip' : ''}`}>
      <h2 className='heading-forth u-margin-bottom-medium section__summary__heading'>{heading}</h2>

      <SummaryGallery year={year} flip={flip} />
    </section>
  );
}
