import { NextRequest, NextResponse } from "next/server";
import { webhookData } from "@/lib/mock-db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
console.log("Webhook key:", endpointSecret);

export async function POST(req: NextRequest) {
  const body = await req.text(); //Retourne le body en texte brut car Stripe l'exige
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Erreur de vérification du webhook:", error.message);
      return new NextResponse(`Webhook Error: ${error.message}`, {
        status: 400,
      });
    }
    console.error("Erreur inconnue dans le webhook :", error);
    return new NextResponse("Unknown webhook error", { status: 400 });
  }

  //Gestion des différents événements
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        "checkout.session.completed - ✅ Paiement réussi pour :",
        session.customer_email
      );
      console.log("Toutes les infos de la session:", session);

      const rawCustomer = session.customer;
      const rawSubscription = session.subscription;
      const rawInvoice = session.invoice;

      const customerId =
        typeof rawCustomer === "string" ? rawCustomer : rawCustomer?.id ?? null;

      const subscriptionId =
        typeof rawSubscription === "string"
          ? rawSubscription
          : rawSubscription?.id ?? null;

      const latestInvoiceId =
        typeof rawInvoice === "string"
          ? rawInvoice
          : rawInvoice?.id ?? undefined;

      const email = session.metadata?.email ?? "";

      const priceId = session.metadata?.price_id ?? "";

      if (!customerId || !subscriptionId || !priceId) {
        console.warn(
          "Données incomplètes : pas de customerId, subscriptionId ou priceId."
        );
        break;
      }

      webhookData[email] = {
        customerId,
        subscriptionId,
        email,
        priceId,
        paymentMethodId: undefined,
        latestInvoiceId,
        status: "incomplete",
        updatedAt: Date.now(),
      };
      console.log("webhook Data:", webhookData);
      break;

    case "invoice.paid":
      const invoice = event.data.object as Stripe.Invoice;
      console.log("invoice.paid - 📄 Facture payée :", invoice.id);
      // console.log("Toutes les infos de la facture:", invoice);
      break;

    case "customer.subscription.updated":
      const sub = event.data.object as Stripe.Subscription;
      console.log(
        "customer.subscription.updated - 🔄 Abonnement mis à jour :",
        sub.id
      );
      console.log("Toutes les infos de l'abonnement:", sub);
      break;

    default:
      console.log(`ℹ️  Événement non géré : ${event.type}`);
  }
  return NextResponse.json({ received: true });
}
