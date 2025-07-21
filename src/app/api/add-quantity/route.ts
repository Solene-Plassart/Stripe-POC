import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addedQuantity = body.addedQuantity;
    const key = body.key;

    const customerId =
      key === "year"
        ? process.env.YEARLY_STRIPE_CUSTOMER_ID!
        : process.env.MONTHLY_STRIPE_CUSTOMER_ID!;

    // 1. Vérifier que le client a une carte enregistrée
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

    // 2. Définir la carte par défaut si ce n'est pas fait
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethods.data[0].id,
      },
    });

    // 3. Trouver l’abonnement actif
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

    const newQuantity = item.quantity + addedQuantity;

    // 4. Mettre à jour la quantité avec prorata
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: item.id,
          quantity: newQuantity,
        },
      ],
      proration_behavior: "create_prorations",
    });

    // 5. Créer la facture
    const invoice = await stripe.invoices.create({
      customer: customerId,
      subscription: subscription.id,
      collection_method: "charge_automatically",
      description: `Facture prorata pour ajout de ${addedQuantity} casque(s)`,
    });

    // 6. Finaliser = paiement immédiat si carte enregistrée
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id!);

    // 7. Paiement immédiat
    const paidInvoice = await stripe.invoices.pay(invoice.id!);

    return NextResponse.json({
      message: `✅ ${addedQuantity} casque(s) ajouté(s), facture payée.`,
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
