// Cloudflare Pages Function — POST /api/newsletter
//
// Web-side counterpart to the iOS `newsletter-signup` Supabase Edge
// Function. Subscribes an email to the Sleepr Newsletter topic on
// Resend and sends a welcome email on first signup.
//
// Differences from the iOS version:
//   - No auth: email comes from the request body, not a JWT.
//   - No per-user DB on this side, so we rely on Resend's contact
//     state (create vs already-exists) for welcome-email idempotency
//     — we send the welcome only on a fresh POST /contacts success.
//   - Same welcome copy as the iOS flow (text + HTML), so users get
//     a consistent message whether they signed up in the app or here.
//
// Required env vars (Cloudflare Pages dashboard → Settings → Env
// variables, scoped to Production and Preview):
//   RESEND_API_KEY               — your re_... key
//   RESEND_NEWSLETTER_TOPIC_ID   — the Newsletter topic UUID
//                                  (currently 76dceb47-5c86-4920-a1e0-9608e2bcaa47)

interface Env {
	RESEND_API_KEY: string;
	RESEND_NEWSLETTER_TOPIC_ID: string;
}

const RESEND_CONTACTS_URL = 'https://api.resend.com/contacts';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

const SENDER = 'Sleepr Team <team@sleeprapp.org>';
const REPLY_TO = 'sleeprsupport@gmail.com';
const SUBJECT = 'Welcome to Sleepr 🌙';

// Stopgap unsubscribe target — matches the iOS version. Replace with
// a hosted one-click unsub endpoint when v1.1 ships proper infra.
const UNSUBSCRIBE_MAILTO =
	'mailto:sleeprsupport@gmail.com?subject=Unsubscribe%20me%20from%20Sleepr%20newsletter';

// Same-origin form posts don't need CORS, but we add permissive
// headers so the endpoint also works from other tools (Postman, etc).
const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
	});
}

// Lightweight RFC 5322-ish check. Backend validation only — the
// browser <input type="email"> already rejects obvious garbage.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: unknown): value is string {
	return typeof value === 'string' && value.length <= 254 && EMAIL_REGEX.test(value);
}

interface ResendStepResult {
	ok: boolean;
	status: number;
	detail?: string;
}

async function createContact(
	email: string,
	topicId: string,
	apiKey: string,
): Promise<ResendStepResult> {
	const headers = {
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json',
	};

	try {
		const res = await fetch(RESEND_CONTACTS_URL, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				email,
				topics: [{ id: topicId, subscription: 'opt_in' }],
			}),
		});

		if (res.ok) {
			return { ok: true, status: res.status };
		}

		const detail = await res.text().catch(() => '');
		return { ok: false, status: res.status, detail };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			detail: `Network error contacting Resend: ${(err as Error).message}`,
		};
	}
}

async function reassertTopicSubscription(
	email: string,
	topicId: string,
	apiKey: string,
): Promise<ResendStepResult> {
	const url = `https://api.resend.com/contacts/by-email/${encodeURIComponent(email)}`;

	try {
		const res = await fetch(url, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				topics: [{ id: topicId, subscription: 'opt_in' }],
			}),
		});

		if (res.ok) return { ok: true, status: res.status };

		const detail = await res.text().catch(() => '');
		return { ok: false, status: res.status, detail };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			detail: `Network error contacting Resend: ${(err as Error).message}`,
		};
	}
}

const WELCOME_TEXT = `Hey,

Thanks for signing up for updates from the Sleepr team. We're glad to have you.

We built Sleepr because we believe better sleep starts with understanding it — and that understanding shouldn't come at the cost of your privacy. Every sleep session you record is analysed on your device, never uploaded.

We'll send you an email about once a month with:

- New features and improvements coming to Sleepr
- Things we're learning about sleep
- Occasional behind-the-scenes notes from building the app

No spam, no daily emails. If it ever stops being interesting, you can unsubscribe at the bottom of any email.

Sleep well,
The Sleepr Team

sleeprapp.org`;

const WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to Sleepr</title>
</head>
<body style="margin:0;padding:0;background-color:#1A2A4A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1A2A4A;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:0 0 32px 0;">
            <div style="font-size:48px;line-height:1;">🌙</div>
            <div style="font-size:13px;font-weight:700;letter-spacing:3px;color:#B0A8C8;text-transform:uppercase;padding-top:14px;">Sleepr</div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 8px 16px 8px;">
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3;">Welcome to Sleepr 🌙</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 8px;font-size:16px;line-height:1.6;color:#E4DFEF;">
            <p style="margin:0 0 16px 0;">Hey,</p>
            <p style="margin:0 0 16px 0;">Thanks for signing up for updates from the Sleepr team. We're glad to have you.</p>
            <p style="margin:0 0 16px 0;">We built Sleepr because we believe better sleep starts with understanding it &mdash; and that understanding shouldn't come at the cost of your privacy. Every sleep session you record is analysed on your device, never uploaded.</p>
            <p style="margin:0 0 12px 0;">We'll send you an email about once a month with:</p>
            <ul style="margin:0 0 16px 0;padding-left:20px;color:#E4DFEF;">
              <li style="margin-bottom:8px;">New features and improvements coming to Sleepr</li>
              <li style="margin-bottom:8px;">Things we're learning about sleep</li>
              <li style="margin-bottom:8px;">Occasional behind-the-scenes notes from building the app</li>
            </ul>
            <p style="margin:0 0 24px 0;">No spam, no daily emails. If it ever stops being interesting, you can unsubscribe at the bottom of any email.</p>
            <p style="margin:0 0 4px 0;">Sleep well,</p>
            <p style="margin:0 0 24px 0;">The Sleepr Team</p>
            <p style="margin:0;">
              <a href="https://sleeprapp.org" style="color:#B59CE0;text-decoration:none;">sleeprapp.org</a>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:48px 8px 16px 8px;font-size:12px;color:#7C6BAD;">
            <a href="${UNSUBSCRIBE_MAILTO}" style="color:#B0A8C8;text-decoration:underline;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

async function sendWelcomeEmail(
	toEmail: string,
	apiKey: string,
): Promise<ResendStepResult> {
	const body = {
		from: SENDER,
		to: [toEmail],
		subject: SUBJECT,
		text: WELCOME_TEXT,
		html: WELCOME_HTML,
		reply_to: REPLY_TO,
		headers: {
			'List-Unsubscribe': `<${UNSUBSCRIBE_MAILTO}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		},
	};

	try {
		const res = await fetch(RESEND_EMAILS_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		});

		if (res.ok) return { ok: true, status: res.status };
		const detail = await res.text().catch(() => '');
		return { ok: false, status: res.status, detail };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			detail: `Network error contacting Resend: ${(err as Error).message}`,
		};
	}
}

// CORS preflight
export const onRequestOptions = () =>
	new Response(null, { headers: CORS_HEADERS });

export const onRequestPost = async (context: {
	request: Request;
	env: Env;
}): Promise<Response> => {
	const { request, env } = context;

	// --- Required secrets ---
	if (!env.RESEND_API_KEY || !env.RESEND_NEWSLETTER_TOPIC_ID) {
		console.error(
			'[newsletter] missing RESEND_API_KEY or RESEND_NEWSLETTER_TOPIC_ID',
		);
		return jsonResponse({ error: 'Server misconfigured' }, 500);
	}

	// --- Parse body ---
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const email =
		typeof payload === 'object' && payload !== null
			? (payload as Record<string, unknown>).email
			: undefined;

	if (!isValidEmail(email)) {
		return jsonResponse(
			{ error: 'Please enter a valid email address.' },
			400,
		);
	}

	const normalised = email.trim().toLowerCase();

	// --- Step 1: Try to create the contact + subscribe to the topic.
	//     A clean 200/201 means the email is new on Resend → safe to
	//     send the welcome.
	const create = await createContact(
		normalised,
		env.RESEND_NEWSLETTER_TOPIC_ID,
		env.RESEND_API_KEY,
	);

	if (create.ok) {
		const email = await sendWelcomeEmail(normalised, env.RESEND_API_KEY);
		if (!email.ok) {
			// Contact was created but the welcome failed to send. Log
			// for follow-up; user-facing message is still success since
			// they're subscribed and will get the next broadcast.
			console.error(
				`[newsletter] contact created but welcome failed for ${normalised}: ${email.status} ${email.detail ?? ''}`,
			);
		}
		return jsonResponse({
			status: 'subscribed',
			message:
				"You're on the list. Check your inbox for a welcome email — and welcome to Sleepr.",
		});
	}

	// 5xx → Resend hiccup. Surface a retryable error.
	if (create.status >= 500) {
		console.error(
			`[newsletter] Resend contact 5xx for ${normalised}: ${create.detail ?? ''}`,
		);
		return jsonResponse(
			{
				error:
					"Our newsletter provider is having a moment. Please try again in a few minutes.",
			},
			503,
		);
	}

	// --- Step 2: Any 4xx is treated as "contact may already exist".
	//     Re-assert the topic subscription (covers users who unsubscribed
	//     via Resend's link and want back in) — but do NOT send a welcome.
	const patch = await reassertTopicSubscription(
		normalised,
		env.RESEND_NEWSLETTER_TOPIC_ID,
		env.RESEND_API_KEY,
	);

	if (patch.ok) {
		return jsonResponse({
			status: 'already_subscribed',
			message:
				"You're already on the list — thanks for sticking around. Watch for the next update soon.",
		});
	}

	// Both create and patch failed. Surface the original create error.
	console.error(
		`[newsletter] Resend rejected ${normalised}: create ${create.status} ${create.detail ?? ''}; patch ${patch.status} ${patch.detail ?? ''}`,
	);

	return jsonResponse(
		{ error: "We couldn't subscribe that email. Please try again later." },
		400,
	);
};
