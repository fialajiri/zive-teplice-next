/** @format */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface ImageSlideshowProps {
  folderName: string;
  length: number;
}

// import img1 from '../../../public/img/2021-muzeum/img-1.jpg';
// import img2 from '../../../public/img/2021-muzeum/img-2.jpg';
// import img3 from '../../../public/img/2021-muzeum/img-3.jpg';
// import img4 from '../../../public/img/2021-muzeum/img-4.jpg';
// import img5 from '../../../public/img/2021-muzeum/img-5.jpg';

// const images = [
//   { image: img1, alt: 'image' },
//   { image: img2, alt: 'image' },
//   { image: img3, alt: 'image' },
//   { image: img4, alt: 'image' },
//   { image: img5, alt: 'image' },
// ];

export default function ImageSlideshow({ folderName, length }: ImageSlideshowProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = useMemo(() => {
    const newImages = [];
    for (let i = 0; i < length; i++) {
      newImages.push({
        imagePath: `/img/${folderName}/img-${i + 1}.jpg`,
        alt: `${folderName}-image-${i}`,
      });
    }
    return newImages;
  }, [folderName, length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className='image-slideshow'>
      {images.map((image, index) => (
        <Image
          key={index}
          src={image.imagePath}
          className={index === currentImageIndex ? 'active' : ''}
          alt={image.alt}
          fill
        />
      ))}
    </div>
  );
}
