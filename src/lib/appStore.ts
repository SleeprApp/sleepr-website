// Central App Store link + Apple App Analytics campaign tagging.
//
// How the download tracking works:
//   - Each placement on the site links to the App Store with its own `ct`
//     (campaign token) — e.g. `website_hero`, `website_footer`. Apple then
//     reports downloads per `ct` in App Store Connect → App Analytics →
//     Acquisition → Campaigns. That is your "downloads produced by the
//     website" number, broken down by button. No tracking code, no cookies.
//   - `pt` (provider token) is optional and identifies your account/provider.
//
// TO ACTIVATE:
//   1. In App Store Connect → App Analytics, create campaign links for the
//      `Campaign` values below (or just let the `ct` tags report themselves).
//   2. If you have a provider token, paste it into PROVIDER_TOKEN. Until then
//      it is left out of the URL so links stay clean and valid.

const APP_STORE_BASE =
	'https://apps.apple.com/app/sleepr-ai-sleep-tracker/id6764422192';

// TODO: replace with your real provider token from App Store Connect.
const PROVIDER_TOKEN = 'PROVIDER_TOKEN';

export type Campaign =
	| 'website_hero'
	| 'website_nav'
	| 'website_download'
	| 'website_footer';

/** Build the App Store URL for a given on-site placement, tagged for App Analytics. */
export function appStoreUrl(campaign: Campaign): string {
	const params = new URLSearchParams({ ct: campaign, mt: '8' });
	if (PROVIDER_TOKEN && PROVIDER_TOKEN !== 'PROVIDER_TOKEN') {
		params.set('pt', PROVIDER_TOKEN);
	}
	return `${APP_STORE_BASE}?${params.toString()}`;
}
