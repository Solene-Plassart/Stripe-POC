import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID manquant" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    return NextResponse.json({
      id: session.id,
      email: session.customer_email,
      customer: session.customer,
      subscription: session.subscription,
      amount_total: session.amount_total,
      metadata: session.metadata,
      status: session.status,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Erreur de récupération de session :", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error(
      "Erreur inconnue lors de la récupération de session :",
      error
    );
    return NextResponse.json(
      { error: "Erreur de récupération de session" },
      { status: 500 }
    );
  }
}
