# Insurance provider artwork and scope

28 provider choices (26 insurance brands and 2 HMO providers) share one asset per brand across eligible insurance types. The 28 transparent, padded 128 × 128 WebP files total 109,160 bytes. Source marks retain their proportions and colors; no artwork was generated. Picker search and calendar text keep long wordmarks identifiable at small tile sizes.

The picker identifies the provider named on an existing policy or healthcare plan. It does not connect to a provider, sell coverage, or assert a plan's eligibility. Health includes critical-illness and medical protection, while Maxicare and MediCard are explicitly labeled HMO. Other Insurance supports the whole catalog, including accident policies; Other insurer / provider accepts an optional custom name. Existing saved reminders receive no guessed provider.

Provider selection belongs to the six standalone insurance reminder types. Vehicle records can contain several policies and other dates, so their existing manufacturer identity remains intact; a separate Vehicle Insurance reminder can name its insurer.

Brand identities remain distinct: BPI AIA, BPI/MS and BPI bank artwork are separate; Sun Life and Sun Life Grepa are separate; Manulife and Manulife China Bank Life are separate. Logos are reused across insurance types, not substituted with a parent bank's logo. Generali remains selectable for existing policies under that name.

## Logo sources

Published provider artwork came from official websites or the Philippine Life Insurance Association's member directory at https://plia.org.ph/. PLIA assets are used where provider sites did not allow retrieving their logos. BPI/MS's original mark was extracted from page 29 of its official annual report. Background padding was made transparent and images resized for local delivery.

| Brand | Source artwork |
|---|---|
| Sun Life | https://plia.org.ph/wp-content/uploads/2017/06/sunlife-financial.jpg |
| Pru Life UK | https://www.prulifeuk.com.ph/content/dam/prudential-aem-lbu/pluk/en/assets/images/icons/logos/prulife-uk-logo.png |
| AIA Philippines | https://plia.org.ph/wp-content/uploads/2021/09/AIA-PHL-copy.jpg |
| AXA Philippines | https://www.axa.com.ph/content/dam/icons/head-icons/AXA-apple-touch-icon-192x192.png |
| Manulife | https://plia.org.ph/wp-content/uploads/2023/08/Manulife-copy.png |
| Insular Life | https://dr5mk4ppf3xok.cloudfront.net/web/production/assets/main-logo-0d5c881dc07e16ec384ca7161fa03bfa0d25029965a22d204e74529051141f73.webp |
| FWD | https://images.contentstack.io/v3/assets/blt9d245055972fde4e/bltd5dbf5069ed9bacf/679831f18bc2d8d91e747129/fwd_logo_2025v2.webp |
| Allianz PNB Life | https://plia.org.ph/wp-content/uploads/2017/06/allianz-pnb-life.jpg |
| BDO Life | https://plia.org.ph/wp-content/uploads/2017/06/bdo-life.jpg |
| BPI AIA | https://plia.org.ph/wp-content/uploads/2022/02/BPI-AIA-copy.jpg |
| Sun Life Grepa | https://www.sunlifegrepa.com/wp-content/uploads/2019/03/SUNLIFELOGO-1024x205-e1554118779946.png |
| Manulife China Bank Life | https://plia.org.ph/wp-content/uploads/2023/11/Manulife-China-copy.png |
| EastWest Ageas | https://ewageas.com.ph/common-assets/img/ewa-purple-horizontal-logo.svg |
| Generali | https://plia.org.ph/wp-content/uploads/2017/06/generali-philippines.jpg |
| Singlife | https://6rt99wqv.media.zestyio.com/Header--162-x-50---.svg |
| Malayan Insurance | https://www.malayan.com/mico2022-[light].webp |
| Standard Insurance | https://www.standard-insurance.com/images/standard-insurance/standard-insurance-logo.png |
| Pioneer Insurance | https://pioneer.com.ph/wp-content/themes/pioneer_theme/assets/images/pioneer_logo.png |
| BPI/MS | https://bpims.com/wp-content/uploads/2024/04/BPI-MS_AR-2023_Online_Res.pdf (page 29, original logo extracted) |
| Oona Insurance | https://myoona.ph/content/dam/oona/aem-images/header/oona-purple-logo.svg |
| COCOGEN | https://www.cocogen.com/assets/img/logo.svg |
| FPG Insurance | https://ph.fpgins.com/public/img/fpg-insurance.png |
| Mercantile Insurance | https://www.mercantile.ph/wp-content/uploads/2023/08/cropped-favicon-180x180.png |
| PGA Sompo | https://store.pgasompo.com.ph/img/logo.svg |
| Prudential Guarantee | https://prudentialguarantee.com/wp-content/uploads/2021/04/LOGO-NEW3.png |
| Pacific Cross | https://cdn.prod.website-files.com/685ac8e11e786ddc90278247/685ac8e11e786ddc9027869d_pacific-cross-logo.avif |
| Maxicare | https://www.maxicare.com.ph/wp-content/uploads/2022/11/new-home-logo.png |
| MediCard | https://www.medicardphils.com/wp-content/uploads/2023/03/MediCard-Logo-Coloredv2.png |

## Reminder eligibility

The frontend and database enforce the same map; catalog/SQL consistency is covered by tests. These are reminder classifications, not a claim that every insurance plan or rider is sold separately.

| Brand | Types | Provider website |
|---|---|---|
| Sun Life | life-insurance, health-insurance; other-insurance | https://www.sunlife.com.ph/ |
| Pru Life UK | life-insurance, health-insurance; other-insurance | https://www.prulifeuk.com.ph/ |
| AIA Philippines | life-insurance, health-insurance; other-insurance | https://www.aia.com.ph/ |
| AXA Philippines | life-insurance, health-insurance, vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://www.axa.com.ph/ |
| Manulife | life-insurance, health-insurance; other-insurance | https://www.manulife.com.ph/ |
| Insular Life | life-insurance, health-insurance; other-insurance | https://www.insularlife.com.ph/ |
| FWD | life-insurance, health-insurance; other-insurance | https://www.fwd.com.ph/ |
| Allianz PNB Life | life-insurance, health-insurance; other-insurance | https://www.allianzpnblife.ph/ |
| BDO Life | life-insurance, health-insurance; other-insurance | https://www.bdo.com.ph/bdo-life |
| BPI AIA | life-insurance, health-insurance; other-insurance | https://www.bpi-aia.com.ph/ |
| Sun Life Grepa | life-insurance, health-insurance; other-insurance | https://www.sunlifegrepa.com/ |
| Manulife China Bank Life | life-insurance, health-insurance; other-insurance | https://www.manulife-chinabank.com.ph/ |
| EastWest Ageas | life-insurance, health-insurance; other-insurance | https://ewageas.com.ph/ |
| Generali | life-insurance, health-insurance; other-insurance | https://www.generali.com.ph/ |
| Singlife | life-insurance, health-insurance; other-insurance | https://singlife.com.ph/ |
| Malayan Insurance | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://malayan.com/ |
| Standard Insurance | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://www.standard-insurance.com/ |
| Pioneer Insurance | life-insurance, health-insurance, vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://pioneer.com.ph/ |
| BPI/MS | health-insurance, vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://bpims.com/ |
| Oona Insurance | health-insurance, vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://myoona.ph/ |
| COCOGEN | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://www.cocogen.com/ |
| FPG Insurance | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://www.fpgins.com/ |
| Mercantile Insurance | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://www.mercantile.ph/ |
| PGA Sompo | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://www.pgasompo.com.ph/ |
| Prudential Guarantee | vehicle-insurance, home-insurance, travel-insurance; other-insurance | https://prudentialguarantee.com/ |
| Pacific Cross | health-insurance, travel-insurance; other-insurance | https://www.pacificcross.com.ph/ |
| Maxicare | health-insurance; other-insurance | https://www.maxicare.com.ph/ |
| MediCard | health-insurance; other-insurance | https://www.medicardphils.com/ |

Additional product references used for the cross-category map:
- AXA: https://www.axa.com.ph/
- Pioneer: https://pioneer.com.ph/
- Oona: https://myoona.ph/all-product/
- COCOGEN: https://www.cocogen.com/our-company
- Mercantile: https://www.mercantile.ph/product/
- Prudential Guarantee: https://prudentialguarantee.com/products/travel-insurance/
- FPG: https://ph.fpgins.com/products/travel/international/
- BPI/MS critical illness: https://www.bpi.com.ph/about-bpi/news/bpi-bpi-ms-roll-out-kaya-care-to-support-filipinos-facing-major-health-risks
- BPI/MS property: https://bpims.com/wp-content/uploads/2024/11/Home-Protection_Insuring-TCs.pdf
- Malayan through its distribution partner RCBC: https://www.rcbc.com/slgfi-main-page/malayan-products
- PGA Sompo property: https://www.pgasompo.com.ph/files/live/sites/sompo-ph/files/Personal%20-%20CondoCARE/CondoCARE%20POLICY%20WORDINGS.pdf
- PGA Sompo travel: https://www.pgasompo.com.ph/files/live/sites/sompo-ph/files/TJP%20BROCHURE%20DIRECT.pdf
- Standard travel: https://www.standard-insurance.com/files/travel/Travel_Protect_Brochure10142024.pdf
- Pacific Cross: https://www.pacificcross.com.ph/
- Maxicare: https://www.maxicare.com.ph/about-us/who-we-are/
- MediCard: https://www.medicardphils.com/healthcare-programs/standard/
