# Apple Calendar / iCal Setup

Curated connects to Apple Calendar through a read-only iCalendar (`.ics`) subscription URL. Curated never asks for an Apple ID, Apple password, or app-specific password.

## Before you connect

An Apple **Public Calendar** link is a bearer link: anyone who has the complete URL may be able to read that calendar. Use a dedicated calendar containing only events you want Curated to use. Do not publish calendars containing highly sensitive personal, medical, financial, or confidential work information.

Curated encrypts the subscription URL at rest, fetches it only from the server, never returns it to the browser after saving, and retrieves only the current day's minimal event fields used by Daily Agenda.

## Obtain the link on iPhone or iPad

1. Open the **Calendar** app.
2. Tap **Calendars** at the bottom.
3. Tap the information (`i`) button beside the iCloud calendar you want to share.
4. Turn on **Public Calendar**.
5. Tap **Share Link**, then copy the link.
6. Apple may provide a link beginning with `webcal://`. Before entering it in Curated, replace only `webcal://` with `https://`.

## Obtain the link on Mac

1. Open the **Calendar** app.
2. In the calendar list, Control-click the iCloud calendar you want to share and choose **Share Calendar**.
3. Select **Public Calendar**.
4. Choose the share/copy option and copy the generated link.
5. If the link begins with `webcal://`, replace only `webcal://` with `https://` before entering it in Curated.

## Connect in Curated

1. Open **Dress My Day**.
2. Find **Today from Apple Calendar**.
3. Select **Connect Apple Calendar**.
4. Enter a safe display name and paste the HTTPS subscription URL.
5. Select **Connect securely**.

Curated validates the URL and feed before storing it. Links using HTTP, credentials in the URL, nonstandard ports, localhost, private networks, unsafe redirects, oversized responses, or invalid ICS data are rejected.

## Refresh, reconnect, or disconnect

- **Refresh** retrieves the current feed again and applies updated, cancelled, recurring, timezone-aware, and all-day events.
- **Reconnect** replaces the saved encrypted URL with a newly generated public-calendar link.
- **Disconnect** permanently deletes Curated's encrypted subscription URL and all connection metadata. It does not change Apple Calendar sharing settings.

To invalidate the old URL at Apple, return to the calendar's sharing settings and turn off **Public Calendar**. You can turn it on again to generate a new link, then use **Reconnect** in Curated.

## Troubleshooting

- **Invalid link:** Confirm it is the full subscription link and begins with `https://`; convert `webcal://` to `https://`.
- **Unreachable feed:** Confirm Public Calendar remains enabled and try Refresh later.
- **Empty calendar:** The connection works, but the feed has no event overlapping today in your Curated profile timezone.
- **Error:** Disconnect and reconnect using a newly generated Apple Public Calendar link.
