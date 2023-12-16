/** @format */

import Image from 'next/image';

interface HeroSummaryGalleryProps {
  flip: boolean;
  year: number | string;
}

export default function HeroSummaryGallery({ flip, year }: HeroSummaryGalleryProps) {
  const path = '/img/' + year + '/';

  return (
    <div className={`summary__gallery ${flip === true ? 'summary__gallery--flip' : ''}`}>
      <figure className='summary__gallery__item summary__gallery__item--1'>
        <Image
          src={`${path}img-1.jpg`}
          alt='Gallery image 1'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--2'>
        <Image
          src={`${path}img-2.jpg`}
          alt='Gallery image 2'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--3'>
        <Image
          src={`${path}img-3.jpg`}
          alt='Gallery image 3'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--4'>
        <Image
          src={`${path}img-4.jpg`}
          alt='Gallery image 4'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--5'>
        <Image
          src={`${path}img-5.jpg`}
          alt='Gallery image 5'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--6'>
        <Image
          src={`${path}img-6.jpg`}
          alt='Gallery image 6'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--7'>
        <Image
          src={`${path}img-7.jpg`}
          alt='Gallery image 7'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--8'>
        <Image
          src={`${path}img-8.jpg`}
          alt='Gallery image 8'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
      <figure className='summary__gallery__item summary__gallery__item--9'>
        <Image
          src={`${path}img-9.jpg`}
          alt='Gallery image 9'
          className='summary__gallery__img'
          layout='fill'
          objectFit='cover'
        />
      </figure>
    </div>
  );
}
