/**
 * @file app/api/add-quantity/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Handler POST pour augmenter la quantité d’un abonnement Stripe avec facturation immédiate.
 *
 * Étapes :
 * 1. Vérifie la présence d’un moyen de paiement.
 * 2. Définit la carte par défaut si ce n’est pas encore fait.
 * 3. Récupère l’abonnement actif (mensuel ou annuel).
 * 4. Met à jour la quantité avec proration ("create_prorations").
 * 5. Crée et finalise la facture pour le prorata.
 * 6. Règle automatiquement la facture (paiement immédiat).
 *
 * @param {NextRequest} req - Requête contenant "addedQuantity" (nombre à ajouter) et "key" ("month" ou "year").
 * @returns {Promise<NextResponse>} Détail de la facture ou erreur.
 *
 * @throws {400 Bad Request} Si aucune carte ou aucun abonnement actif n’est trouvé.
 * @throws {500 Internal Server Error} En cas d’erreur Stripe ou interne.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addedQuantity: number = body.addedQuantity;
    const key: string = body.key;

    if (addedQuantity <= 0 || !["month", "year"].includes(key)) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    const customerId: string =
      key === "year"
        ? process.env.YEARLY_STRIPE_CUSTOMER_ID!
        : process.env.MONTHLY_STRIPE_CUSTOMER_ID!;

    // 1
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    if (paymentMethods.data.length === 0) {
      return NextResponse.json(
        { error: "Aucune carte enregistrée pour le client." },
        { status: 400 }
      );
    }

    // 2
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethods.data[0].id,
      },
    });

    // 3
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "Aucun abonnement actif trouvé" },
        { status: 400 }
      );
    }

    const subscription = subscriptions.data[0];
    const item = subscription.items.data[0];
    const startQuantity: number | undefined = item.quantity;
    let newQuantity: number;

    if (startQuantity) {
      newQuantity = startQuantity + addedQuantity;
    } else {
      newQuantity = addedQuantity;
    }

    // 4
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: item.id,
          quantity: newQuantity,
        },
      ],
      proration_behavior: "create_prorations",
    });

    // 5
    const invoice = await stripe.invoices.create({
      customer: customerId,
      subscription: subscription.id,
      collection_method: "charge_automatically",
      description: `Facture prorata pour ajout de ${addedQuantity} casque(s)`,
    });

    // 6
    await stripe.invoices.finalizeInvoice(invoice.id!);
    const paidInvoice = await stripe.invoices.pay(invoice.id!);

    return NextResponse.json({
      message: `✅ ${addedQuantity} casque(s) ajouté(s), facture payée (montant au prorata : ${
        paidInvoice.amount_paid / 100
      } €)`,
      quantityNow: newQuantity,
      invoiceId: paidInvoice.id,
      invoiceStatus: paidInvoice.status,
      amountPaid: paidInvoice.amount_paid / 100,
      hostedInvoiceUrl: paidInvoice.hosted_invoice_url,
    });
  } catch (err) {
    console.error("[Stripe Update Error]", err);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'abonnement" },
      { status: 500 }
    );
  }
}
