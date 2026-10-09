/** Keep in-page guidance local to item details and honour reduced-motion preferences. */
export function guideToSection(id:string) {
  const element=document.getElementById(id);
  if(!element)return;
  const target=element.matches('h2') ? element.closest<HTMLElement>('section') ?? element : element;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headerBottom=document.querySelector('.mobile-header')?.getBoundingClientRect().bottom ?? 0;
  target.style.scrollMarginTop=Math.max(24,headerBottom+16)+'px';
  if(!target.hasAttribute('tabindex'))target.tabIndex=-1;
  target.focus({preventScroll:true});
  target.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
  target.getAnimations().filter(animation=>animation.id==='record-guidance').forEach(animation=>animation.cancel());
  const highlight='0 0 0 3px #7862d6, 0 8px 28px #7862d626';
  const animation=target.animate(reducedMotion ? [{boxShadow:highlight},{boxShadow:highlight}] : [{boxShadow:highlight},{boxShadow:highlight,offset:.65},{boxShadow:'0 0 0 0 transparent'}],{duration:2400,easing:'ease-out'});
  animation.id='record-guidance';
}
