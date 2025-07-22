/**
 * @file app/api/decrease-quantity/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Diminue la quantité d’un abonnement Stripe actif sans effet immédiat (pas de proration).
 *
 * @param {NextRequest} req - Requête contenant "quantityToRemove" (nombre à soustraire) et "key" ("month" ou "year").
 * @returns {Promise<NextResponse>} Une réponse avec la nouvelle quantité prévue ou une erreur.
 *
 * @throws {400 Bad Request} Si aucun abonnement actif n’est trouvé, ou si les données sont invalides.
 * @throws {500 Internal Server Error} En cas d’erreur Stripe ou de traitement interne.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quantityToRemove: number = body.quantityToRemove;

    const key: "month" | "year" = body.key;
    const customerId: string =
      key === "year"
        ? process.env.YEARLY_STRIPE_CUSTOMER_ID!
        : process.env.MONTHLY_STRIPE_CUSTOMER_ID!;

    if (!quantityToRemove || quantityToRemove <= 0) {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    }

    // 1. Récupérer l'abonnement actif
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "Aucun abonnement actif trouvé." },
        { status: 400 }
      );
    }

    const subscription = subscriptions.data[0];
    const item = subscription.items.data[0];

    const newQuantity: number = item.quantity! - quantityToRemove;

    if (newQuantity < 1) {
      return NextResponse.json(
        { error: "La quantité ne peut pas être inférieure à 1." },
        { status: 400 }
      );
    }

    // 2. Mettre à jour la quantité sans proration
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: item.id,
          quantity: newQuantity,
        },
      ],
      proration_behavior: "none",
    });

    return NextResponse.json({
      message: `✅ Quantité réduite à ${newQuantity}, effet au prochain cycle.`,
      quantityNextCycle: newQuantity,
    });
  } catch (err) {
    console.error("[Stripe Decrease Error]", err);
    return NextResponse.json(
      { error: "Erreur lors de la réduction de quantité" },
      { status: 500 }
    );
  }
}
