/** @format */

import { Navbar, NavbarBrand, NavbarContent } from '@nextui-org/navbar';
import Navlink from '../navigation/nav-link';

export default function Header() {
  return (
    <Navbar  className="main__navigation__links header">
      <NavbarBrand></NavbarBrand>
      <NavbarContent className='nav__list'>
        <Navlink href='/'>Domů</Navlink>
        <Navlink href='/program'>Program</Navlink>
        <Navlink href='/gallery'>Gallerie</Navlink>
        <Navlink href='/kontakt'>Kontakt</Navlink>
      </NavbarContent>
    </Navbar>
  );
}
