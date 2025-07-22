/**
 * @file app/api/create-subscription/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

/**
 * Crée une session de paiement Stripe pour un abonnement.
 *
 * @param {NextRequest} req - Requête contenant "lookupKey", "quantity", et "email" dans le body JSON.
 * @returns {Promise<NextResponse>} Une réponse JSON contenant l'URL Stripe ou une erreur.
 *
 * @throws {400 Bad Request} Si aucun tarif n'est trouvé avec la clé donnée.
 * @throws {500 Internal Server Error} En cas d'erreur Stripe ou de traitement inattendu.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lookupKey: string = body.lookupKey;
    const quantity: number = body.quantity;
    const email: string = body.email;
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ["data.product"],
    });

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
