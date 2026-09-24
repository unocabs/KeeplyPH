# Hosted setup checkpoint

Updated 25 September 2026. Setup is in progress; Google login testing is pending.

- Supabase Free project: Keeply PH, reference `crekfqhurszleekaupnc`, organization `fcqccsknmntmxkhpmgic`.
- The dashboard reports the provisioned region as Mumbai (`ap-south-1`); the creation form retained the general Asia-Pacific selection.
- Data API enabled; automatic exposure of new tables disabled. Application migrations provide explicit grants and RLS.
- Project URL, publishable key, and server secret are present in ignored `.env.local`; credential values have not been printed.
- User reports all nine application migrations were successfully applied in the hosted SQL Editor.
- Google Cloud project `keeplyph` (KeeplyPH) is selected under the user's requested account `rgianmcabrera@gmail.com`. Consent setup is in progress with External audience selected. Use that email for support and developer contact.
- An earlier empty Google Cloud project `river-semiotics-509603-g1` was created under the initially signed-in account before the user clarified account separation. No OAuth client was configured there. It has not been deleted.
- User reports the Google OAuth web client, Supabase Google provider, and local/domain redirect configuration are saved. Real sign-in testing remains pending.
- Payments and outgoing email remain disabled. No paid plan or Cloud billing activation was requested.

## Reminder for the Vercel deployment step

Before testing a Vercel deployment, remind the user to register its actual URL in Supabase Authentication URL Configuration (the `/auth/callback` redirect), and its origin in the Google OAuth web client where needed. Keep Google's authorized redirect URI pointed at Supabase's `/auth/v1/callback`. Set the deployment's `APP_URL` and Supabase Site URL to the intended canonical origin. Use explicit trusted deployment URLs; do not broadly allow other people's Vercel projects. Confirm `https://keeplyph.com` at domain cutover. This is a deployment checklist reminder, not a timed notification.
