/** @format */

import Image from 'next/image';
import Link from 'next/link';

import foodIcon from '../../../public/icons/food.svg';
import musicIcon from '../../../public/icons/music.svg';
import craftIcon from '../../../public/icons/craft.svg';
import kidsIcon from '../../../public/icons/kids.svg';

export default function HeroSection() {
  return (
    <section className='hero'>
      <h2 className='heading-secondary hero__heading'>Sousedská slavnost v Teplicích</h2>

      <div className='hero__cards'>
        <div className='hero__card'>
          <Image className='card__icon' src={foodIcon} height={60} width={60} alt='Cart Icon' />
          <h3 className='heading-tertiary hero__card__heading'>Vynikající občerstvení</h3>
          <p className='paragraph hero__card__paragraph'>
            Na Živých Teplicích nikdy nebudete hladoví ani žízniví! Už od prvního ročníku si zakládáme na pestré nabídce
            občerstvení a můžeme se pochlubit opravdu širokou nabídkou. Každý rok máte šanci ochutnat dobroty ze všech
            koutů světa, i když vyrazíte jen do svého sousedství. Nebojte se, nezhynete hladem ani když neholdujete
            masu.
          </p>
        </div>
        <div className='hero__card'>
          <Image className='hero__card__icon' src={musicIcon} height={60} width={60} alt='Music instrument icon' />
          <h3 className='heading-tertiary hero__card__heading'>Živé umění</h3>
          <p className='paragraph hero__card__paragraph'>
            Hudba, divadlo, tanec, autorská čtení i výtvarné umění pod širým nebem nebo v krásném prostředí zámku! To
            vše si můžete užít na slavnosti v jednom odpoledni. Za těch pár let zazářilo na slavnosti už mnoho zdejších
            umělců a velmi nás těší, když si u nás někdo střihne svou exhibiční premiéru.
          </p>
        </div>
        <div className='hero__card'>
          <Image className='card__icon' src={craftIcon} height={60} width={60} alt='Paper bird and scissors' />

          <h3 className='heading-tertiary hero__card__heading'>Ruční výrobky</h3>
          <p className='paragraph hero__card__paragraph'>
            Slavnost je přehlídkou lokálních tvůrců, kteří nabízí k prodeji své autorské výrobky. Pořídit si můžete
            šperky, všemožné dekorace, umělecká díla, něco krásného na sebe i hračky. Nikdy nevíte, co krásného si
            pořídíte, ale vždy si můžete být jistí, že je to s láskou dělané a neputovalo to tisíce kilometrů.
          </p>
        </div>
        <div className='hero__card'>
          <Image className='hero__card__icon' src={kidsIcon} height={60} width={60} alt='Ice-cream on a stick' />

          <h3 className='heading-tertiary hero__card__heading'>Děti s sebou</h3>
          <p className='paragraph hero__card__paragraph'>
            Slavnost každoročně nabízí bohatý program pro drobotinu všeho věku. Již tradičně se dítka zabaví na
            divadelním představení, rozhýbou při lekci dětské jógy nebo dalších sportovních aktivitách. Tvořílci se
            můžou těšit na několik různých workshopů a naučit se nové dovednosti. Obzory si mohou rozšířit díky
            neziskovým projektům, které se u nás prezentují.
          </p>
        </div>
      </div>
      <div className='hero__paragraphs'>
        <p className='paragraph hero__paragraph hero__paragraph--1'>
          Sousedská slavnost Živé Teplice podporuje komunitní život v Teplicích a snaží se propojovat lidi různých
          věkových, názorových i národnostních skupin. Jednoduše spojuje všechny, kteří si chtějí zpříjemnit život v
          našem městě a trochu ho oživit. Každoročně se můžete těšit na hudební vystoupení místních umělců, výborné
          občerstvení, výstavu obrazů, divadlo, program neziskových spolků, trh s autorskými výrobky i jógu.
        </p>

        <p className='paragraph hero__paragraph hero__paragraph--2'>
          Každý, kdo něco vytváří, ať je to něco dobrého na zub či k pití, ať je to hudba, divadlo, šperky, hadříky,
          jakékoliv umění či sport se může přihlásit a Živých Teplic se přímo účastnit. Jedinou podmínkou je, že by to
          mělo být něco s vlastním nápadem a z Teplic nebo blízkého okolí...Zaregistrovat se můžete v průběhu celého
          roku a přihlášky na další ročník se otevřou na jaře.
        </p>
      </div>

      <Link href='/register' className='hero__button--1'>
        Chci se zúčastnit
      </Link>
    </section>
  );
}
