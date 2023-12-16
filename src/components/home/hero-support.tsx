/** @format */

import Image from 'next/image';

import dekImg from '../../../public/img/support/logo_DEK_Stavebniny_2.png';
import hanzlikLogo from '../../../public/img/support/logo_hanzlik_2.png';
import tpLogo from '../../../public/img/support/znakTp2.png';
import sayfyLogo from '../../../public/img/support/sayfy-logo-png.webp';

export default function HeroSupport() {
  return (
    <div className='support__container'>
      <h2 className='heading-secondary support__heading'>Děkujeme za podporu</h2>
      <div className='support__images'>
        <div className='support__image'>
          <Image src={dekImg} width={120} height={60} alt='Stavebniny DEK' />
        </div>
        <div className='support__image'>
          <Image src={tpLogo} width={149} height={211} alt='Statutární město Teplice' />
        </div>
        <div className='support__image'>
          <Image src={hanzlikLogo} width={340} height={67} alt='Jan Hanzlík' />
        </div>

        <div className='support__image'>
          <Image src={sayfyLogo} width={120} height={113} alt='Sayfy z.s.' />
        </div>
      </div>
    </div>
  );
}
