/** @format */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavbarItem } from '@nextui-org/react';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function Navlink({ href, children }: NavLinkProps) {
  const path = usePathname();

  return (
    <NavbarItem className={path === href ? 'nav__list__item nav__list__item--active' : 'nav__list__item'}>
      <Link href={href}>{children}</Link>
    </NavbarItem>
  );
}
