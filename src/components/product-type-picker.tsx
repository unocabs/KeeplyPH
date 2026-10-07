'use client';
import { useId } from 'react';
import type { Category } from '@/lib/domain';
import { productTypesFor, resolvedProductType, suggestProductType } from '@/features/purchases/product-types';
import { ProductGlyph } from './icons/product-glyph';
import { CategoryGlyph } from './icons/category-glyph';
import { purchaseIcons } from './icons/icon-specs';
import styles from './product-type-picker.module.css';
export function ProductTypePicker({category,name,value,onChange}:{category:Category|null;name:string;value:string;onChange:(value:string)=>void}) {
 const id=useId(),choices=productTypesFor(category),suggested=suggestProductType(name,category),selected=resolvedProductType(category,name,value);
 const label=choices.find(type=>type.id===selected)?.label;
 const fallback=<CategoryGlyph icon={(category && purchaseIcons[category] || purchaseIcons.other).icon}/>;
 return <div className={'full '+styles.picker}>
  <input type="hidden" name="product_type" value={value}/>
  <details>
   <summary><span className="reminder-icon group-purchases">{selected?<ProductGlyph type={selected}/>:fallback}</span><span><strong>Item type</strong><span className={styles.current}>{value ? label || 'Category icon' : label ? 'Suggested: '+label : 'Automatic · category icon'}</span></span><span className={styles.change}>Change</span></summary>
   <div role="radiogroup" aria-label="Item type" className={styles.grid}>
    {[{id:'',label:'Automatic',type:suggested},{id:'category',label:'Category icon',type:undefined},...choices.map(type=>({id:type.id,label:type.label,type:type.id}))].map(choice=><label key={choice.id} className={styles.option}>
     <input type="radio" name={id} checked={value===choice.id} onChange={()=>onChange(choice.id)} value={choice.id}/>
     <span>{choice.type?<ProductGlyph type={choice.type}/>:fallback}<span>{choice.label}</span></span>
    </label>)}
   </div>
  </details>
  <p className="hint">Automatic suggests an icon from your product name. Choose a type to keep its icon when you rename the item.</p>
 </div>;
}
