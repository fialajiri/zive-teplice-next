/** @format */

import ImageSlideshow from '../common/image-slideshow';

interface HeroYearSummaryProps {  
  year: string;
  heading: string;
}

export default function HeroYearSummary({ year, heading }: HeroYearSummaryProps) {  
  return (
    <section className={`section__summary`}>
      <h2 className='heading-forth u-margin-bottom-medium section__summary__heading'>{heading}</h2>
      <ImageSlideshow length={9} folderName={year} />     
    </section>
  );
}
