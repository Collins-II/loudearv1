import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database";
import { getCurrentUser } from "@/actions/getCurrentUser";
import Stripe from "stripe";


export async function GET() {
	await connectToDatabase();
	const user = await getCurrentUser();
	if (!user?._id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const payment = user.payment ?? {};
	let stripeOnboardingComplete = false;
	if (payment.stripeAccountId && process.env.STRIPE_SECRET_KEY) {
		try {
			const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
			const account = await stripe.accounts.retrieve(payment.stripeAccountId);
			stripeOnboardingComplete = account.details_submitted && account.payouts_enabled;
		} catch (error) {
			console.error("[STRIPE_ACCOUNT_STATUS_ERROR]", error);
		}
	}
	return NextResponse.json({
		methods: [
			{ id: "mtn", type: "mobile_money", provider: "MTN" },
			{ id: "airtel", type: "mobile_money", provider: "Airtel" },
		],
		payment: {
			stripeAccountId: payment.stripeAccountId,
			stripeOnboardingComplete,
			mobileMoney: payment.mobileMoney,
			payoutEnabled: payment.payoutEnabled,
			payoutFrequency: payment.payoutFrequency,
			payoutTime: payment.payoutTime,
		},
	});
}