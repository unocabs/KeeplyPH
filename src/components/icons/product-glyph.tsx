import type { ProductTypeId } from '@/features/purchases/product-types';
const shapes: Record<ProductTypeId, {outline:readonly string[];tone:readonly string[]}> = {
  "earbuds": {
    "outline": [
      "M5 3a3 3 0 0 1 3 3v5a2 2 0 0 1-4 0V8H3V6a3 3 0 0 1 2-3Z",
      "M19 3a3 3 0 0 0-3 3v5a2 2 0 0 0 4 0V8h1V6a3 3 0 0 0-2-3Z",
      "M4 17h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm5 2h6"
    ],
    "tone": [
      "M4 17h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
    ]
  },
  "headphones": {
    "outline": [
      "M4 14v-3a8 8 0 0 1 16 0v3",
      "M4 11h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Zm16 0h-2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z"
    ],
    "tone": [
      "M4 11h3v9H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Zm13 0h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3Z"
    ]
  },
  "phone": {
    "outline": [
      "M7 2.5h10A1.5 1.5 0 0 1 18.5 4v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5ZM10 5h4m-3 14h2"
    ],
    "tone": [
      "M7 7h10v9H7Z"
    ]
  },
  "tablet": {
    "outline": [
      "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM11 18h2"
    ],
    "tone": [
      "M6 6h12v9H6Z"
    ]
  },
  "laptop": {
    "outline": [
      "M5 4h14a1.5 1.5 0 0 1 1.5 1.5V16h-17V5.5A1.5 1.5 0 0 1 5 4Zm-1.5 12-2 4h21l-2-4M9 20h6"
    ],
    "tone": [
      "M6 7h12v6H6Z"
    ]
  },
  "desktop": {
    "outline": [
      "M13 3h7v18h-7ZM16 6h1m-.5 11v.2M3 5h7v10H3Zm3.5 10v4M4 19h5"
    ],
    "tone": [
      "M13 3h7v7h-7ZM3 5h7v10H3Z"
    ]
  },
  "monitor": {
    "outline": [
      "M3 4h18v13H3Zm9 13v4m-5 0h10"
    ],
    "tone": [
      "M6 7h12v7H6Z"
    ]
  },
  "camera": {
    "outline": [
      "M3 7h4l2-3h6l2 3h4v13H3ZM15.5 13.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM18 10h.1"
    ],
    "tone": [
      "M3 7h18v4H3Z"
    ]
  },
  "speaker": {
    "outline": [
      "M6 3h12v18H6ZM15 15a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-2-8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
    ],
    "tone": [
      "M15 15a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    ]
  },
  "game-console": {
    "outline": [
      "M7 7h10c3 0 4 4 5 9a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2c1-5 2-9 5-9ZM7 10v4m-2-2h4m8-1h.1m2 3h.1"
    ],
    "tone": [
      "M7 7h10l2 8-4-1H9l-4 1Z"
    ]
  },
  "smartwatch": {
    "outline": [
      "M9 3h6l1 4H8Zm0 18h6l1-4H8ZM8 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm1 6 2-3 2 4 2-2m3-2h2"
    ],
    "tone": [
      "M8 7h8v10H8Z"
    ]
  },
  "tv": {
    "outline": [
      "M3 4h18v13H3Zm5 13-2 4m10-4 2 4"
    ],
    "tone": [
      "M6 7h12v7H6Z"
    ]
  },
  "washing-machine": {
    "outline": [
      "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 8h16M7 5.5h3m6 0h.1M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-7 0c2-2 4 2 6 0"
    ],
    "tone": [
      "M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
    ]
  },
  "refrigerator": {
    "outline": [
      "M6 2.5h12v19H6ZM6 10h12M9 6v2m0 5v4"
    ],
    "tone": [
      "M6 10h12v11.5H6Z"
    ]
  },
  "air-conditioner": {
    "outline": [
      "M4 3h16a2 2 0 0 1 2 2v7H2V5a2 2 0 0 1 2-2ZM2 9h20m-6-3h3M7 15v3c0 2-2 2-2 2m7-5v6m5-6v3c0 2 2 2 2 2"
    ],
    "tone": [
      "M2 3h20v6H2Z"
    ]
  },
  "electric-fan": {
    "outline": [
      "M19 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12 7c-2-4-5-2-4 0l3 2m3-1c4-1 4 3 2 3l-3-1m-2 1c-2 3 1 5 2 3l-1-4M12 16v4m-4 1h8"
    ],
    "tone": [
      "M19 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
    ]
  },
  "microwave": {
    "outline": [
      "M3 5h18v14H3ZM6 8h10v8H6ZM19 9v.1m0 3v.1M5 19v2m14-2v2"
    ],
    "tone": [
      "M6 8h10v8H6Z"
    ]
  },
  "oven": {
    "outline": [
      "M4 3h16v18H4ZM4 8h16m-12-3h.1m4 0h.1m4 0h.1M7 11h10v7H7Zm2 0h6"
    ],
    "tone": [
      "M7 11h10v7H7Z"
    ]
  },
  "rice-cooker": {
    "outline": [
      "M5 9c0-4 14-4 14 0M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM4 12H2v4h2m16-4h2v4h-2m-10-2h4m-3-9h2M8 20v1m8-1v1"
    ],
    "tone": [
      "M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"
    ]
  },
  "vacuum": {
    "outline": [
      "M4 17h7l1 4H3ZM8 17l5-9m-2-1 2-4h5v8l-3 4m-5-3 3 2m3 0 4 5m-2-5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
    ],
    "tone": [
      "M4 17h7l1 4H3ZM13 3h5v8h-5Z"
    ]
  },
  "water-dispenser": {
    "outline": [
      "M7 3h10v5H7ZM5 8h14v13H5ZM9 11v2h2m4-2v2h-2M9 16h6v4H9Z"
    ],
    "tone": [
      "M7 3h10v5H7ZM9 16h6v4H9Z"
    ]
  },
  "shirt": {
    "outline": [
      "M8 3a4 4 0 0 0 8 0l5 4-3 4-2-2v12H8V9l-2 2-3-4Z"
    ],
    "tone": [
      "M8 9h8v12H8Z"
    ]
  },
  "polo": {
    "outline": [
      "M8 3h8l5 4-3 4-2-2v12H8V9l-2 2-3-4ZM8 3l4 4 4-4m-4 4v6"
    ],
    "tone": [
      "M8 9h8v12H8Z"
    ]
  },
  "jacket": {
    "outline": [
      "M8 3h8l4 4 2 11-4 1-2-10v12H8V9L6 19l-4-1L4 7ZM8 3l4 5 4-5m-4 5v13M9 16h1m4 0h1"
    ],
    "tone": [
      "M8 9h8v12H8Z"
    ]
  },
  "dress": {
    "outline": [
      "M9 3h6l2 5-3 4 5 9H5l5-9-3-4Zm0 0c0 3 6 3 6 0m-5 9h4"
    ],
    "tone": [
      "M10 12h4l5 9H5Z"
    ]
  },
  "trousers": {
    "outline": [
      "M7 3h10l2 18h-6l-1-11-1 11H5ZM7 7h10m-5-4v4"
    ],
    "tone": [
      "M7 3h10v4H7Z"
    ]
  },
  "shorts": {
    "outline": [
      "M6 4h12l2 15h-7l-1-7-1 7H4ZM6 8h12m-6-4v4"
    ],
    "tone": [
      "M6 4h12v4H6Z"
    ]
  },
  "shoes": {
    "outline": [
      "M3 8h5l3 5 8 2c2 0 3 2 3 4v2H2v-7Zm-1 9h20m-11-4 2-2m1 3 2-2"
    ],
    "tone": [
      "M2 17h20v4H2Z"
    ]
  },
  "bag": {
    "outline": [
      "M4 8h16l1 13H3ZM8 8V6a4 4 0 0 1 8 0v2m-9 5h10"
    ],
    "tone": [
      "M4 8h16l1 13H3Z"
    ]
  },
  "hat": {
    "outline": [
      "M5 14V9a7 7 0 0 1 14 0v5M3 14h18v4c-6 3-12 3-18 0Zm9-12v12"
    ],
    "tone": [
      "M3 14h18v4c-6 3-12 3-18 0Z"
    ]
  },
  "watch": {
    "outline": [
      "M9 3h6l1 4H8Zm0 18h6l1-4H8ZM17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-5-3v3l2 1m3-2h2"
    ],
    "tone": [
      "M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"
    ]
  }
};
export function ProductGlyph({type,size=22}:{type:ProductTypeId;size?:number}) {
 const shape=shapes[type];
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-product-icon={type}>
  <g fill="var(--icon-secondary,currentColor)" fillOpacity=".18" stroke="none">{shape.tone.map((d,i)=><path key={i} d={d}/>)}</g>
  {shape.outline.map((d,i)=><path key={i} d={d}/>)}
 </svg>;
}
