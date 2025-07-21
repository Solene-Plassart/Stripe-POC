import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    const { lookupKey, quantity, email } = await req.json();
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ["data.product"],
    });
    console.log("clé:", lookupKey);
    console.log("tous les prix : ", prices.data);
    const price = prices.data[0];
    if (!price) {
      return NextResponse.json(
        { error: "Aucun tarif trouvé pour cette clé." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: quantity,
        },
      ],
      success_url:
        "http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/cancel",
      customer_email: email,
      metadata: {
        price_id: price.id,
        email: email,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Erreur Stripe checkout :", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("Erreur inconnue Stripe checkout :", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
