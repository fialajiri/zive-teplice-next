/** @format */

import Image from 'next/image';
import img1 from '../../../public/img/hero/img-1.jpg'
import img2 from '../../../public/img/hero/img-2.jpg'
import img3 from '../../../public/img/hero/img-3.jpg'
import img4 from '../../../public/img/hero/img-4.jpg'
import img5 from '../../../public/img/hero/img-5.jpg'
import img6 from '../../../public/img/hero/img-6.jpg'
import img7 from '../../../public/img/hero/img-7.jpg'
import img8 from '../../../public/img/hero/img-8.jpg'
import img9 from '../../../public/img/hero/img-9.jpg'
import img10 from '../../../public/img/hero/img-10.jpg'
import img11 from '../../../public/img/hero/img-11.jpg'
import img12 from '../../../public/img/hero/img-12.jpg'
import img13 from '../../../public/img/hero/img-13.jpg'

const imageArr = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12, img13]
 
export default function HeroGallery() {
  
  return (
    <div className='hero__gallery'>
      {imageArr.map((image, index) => (
        <figure key={index + 1} className={`hero__gallery__item hero__gallery__item--${index + 1}`}>
          <Image
            src={image}
            alt={`Hero gallery image ${index + 1}`}
            className='hero__gallery__img'            
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{objectFit: "cover"}}
            priority
          />
        </figure>
      ))}
    </div>
  );
}
