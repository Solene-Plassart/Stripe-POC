/**
 * @file app/api/webhook/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { webhookData } from "@/lib/mock-db";
import { computeCurrentPeriodEnd } from "@/lib/utils";
import { updateWebhook } from "@/lib/utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});
const endpointSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Handler POST pour les webhooks Stripe: traite les événements envoyés par Stripe.
 * Elle vérifie l’authenticité du webhook via la signature, puis agit selon le type d’événement.
 * Les données sont stockées ou mises à jour dans un stockage temporaire simulé (`webhookData`).
 *
 * @param {NextRequest} req - La requête entrante contenant le corps brut du webhook Stripe.
 * @returns {Promise<NextResponse>} Confirmation de réception (`{ received: true }`) ou erreur 400.
 *
 * @throws {400 Bad Request} Si la signature Stripe est invalide ou si le format du webhook est incorrect.
 * @throws {400 Bad Request} En cas d’erreur inattendue dans la construction de l’événement Stripe.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig: string = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;
  let email: string = "";

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

  switch (event.type) {
    //OUVERTURE DE SESSION STRIPE
    case "checkout.session.completed":
      {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          "checkout.session.completed - ✅ Session de paiement créée pour :",
          session.customer_email
        );

        const rawCustomer = session.customer;
        const rawSubscription = session.subscription;
        const rawInvoice = session.invoice;

        const customerId: string | null =
          typeof rawCustomer === "string"
            ? rawCustomer
            : rawCustomer?.id ?? null;

        const subscriptionId: string | null =
          typeof rawSubscription === "string"
            ? rawSubscription
            : rawSubscription?.id ?? null;

        const latestInvoiceId: string | undefined =
          typeof rawInvoice === "string"
            ? rawInvoice
            : rawInvoice?.id ?? undefined;

        const priceId: string = session.metadata?.price_id ?? "";

        email = session.customer_email ?? "";

        if (!customerId || !subscriptionId || !priceId) {
          console.warn(
            "Données incomplètes : pas de customerId, subscriptionId ou priceId."
          );
          break;
        }

        updateWebhook(email, {
          customerId,
          subscriptionId,
          email,
          priceId,
          paymentMethodId: undefined,
          latestInvoiceId,
          status: "incomplete",
        });
      }

      break;

    //FACTURE PAYEE
    case "invoice.paid":
      {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(
          "invoice.paid - 📄 Facture payée :",
          invoice.id,
          invoice.hosted_invoice_url
        );
        email = invoice.customer_email ?? "";
        if (!email) {
          console.warn("⚠️ Email manquant dans la facture :", invoice.id);
          break;
        }

        updateWebhook(email, {
          latestInvoiceId: invoice.id,
          suspensionEffectiveAt: undefined,
          status: "active",
        });
        console.log(
          `[STRIPE WEBHOOK] invoice.paid => 💰 Paiement confirmé pour ${email}`,
          webhookData
        );
      }

      break;

    //ECHEC DE PAIEMENT DE FACTURE
    case "invoice.payment_failed":
      {
        const failedInvoice = event.data.object as Stripe.Invoice;
        email = failedInvoice.customer_email ?? "";

        if (!email) {
          console.warn(
            "⚠️ Email manquant dans la facture échouée :",
            failedInvoice.id
          );
          break;
        }

        const suspensionEffectiveAt = new Date();
        suspensionEffectiveAt.setDate(suspensionEffectiveAt.getDate() + 30);

        updateWebhook(email, {
          status: "past_due",
          suspensionEffectiveAt,
        });
        console.log(
          `[STRIPE WEBHOOK] invoice.payment.failed => ❌ Paiement échoué pour ${email}, suspension prévue dans 30 jours.`
        );
        // TODO: Implémenter la logique de suppression automatique, en surveillant la date de suspension en BDD.
      }

      break;

    // ABONNEMENT EFFECTUE
    case "customer.subscription.created": {
      const sub: Stripe.Subscription = event.data.object as Stripe.Subscription;

      const customerId: string =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

      const planInterval: string = sub.items.data[0].plan.interval;
      let currentPeriodEnd: Date | undefined;

      if (planInterval === "month" || planInterval === "year") {
        currentPeriodEnd = computeCurrentPeriodEnd(
          sub.start_date ?? sub.created,
          planInterval
        );
      } else {
        console.warn("⛔ Intervalle non supporté :", planInterval);
      }

      const customer = await stripe.customers.retrieve(customerId);

      const email: string | null =
        typeof customer === "object" && "email" in customer
          ? customer.email
          : "";

      if (!email) {
        console.warn("Impossible de retrouver l'email du client");
        break;
      }

      // Ajouter l'email dans les metadata => lien avec le client dans mon mock (environnement test seulement)
      await stripe.subscriptions.update(sub.id, {
        metadata: {
          email: email,
        },
      });

      updateWebhook(email, {
        customerId: sub.customer as string,
        subscriptionId: sub.id,
        email: email,
        priceId: sub.items.data[0]?.price?.id ?? "",
        paymentMethodId: sub.default_payment_method as string,
        latestInvoiceId: sub.latest_invoice as string,
        status: sub.status,
        currentPeriodEnd,
      });

      console.log(
        `[STRIPE WEBHOOK] customer.subscription.created => ✅ Souscription effectuée pour ${email}`
      );
      console.log("Date de fin de période :", currentPeriodEnd);

      break;
    }

    //ABONNEMENT MIS A JOUR
    case "customer.subscription.updated":
      {
        const sub = event.data.object as Stripe.Subscription;

        //Récupération du mail en metadata (environnement test seulement)
        email = sub.metadata?.email ?? "";

        updateWebhook(email, {
          status: sub.status,
        });

        console.log(
          `[STRIPE WEBHOOK] customer.subscription.updated => 🔄 Abonnement mis à jour pour ${email}`
        );
      }
      break;

    // CLÔTURE D'ABONNEMENT
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      // Récupérer l'email via customerId (environnement test seulement)
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const customer = await stripe.customers.retrieve(customerId);
      if (
        typeof customer === "object" &&
        "email" in customer &&
        customer.email
      ) {
        email = customer.email;
      }

      if (!email) {
        console.warn(
          "❌ Impossible de retrouver l'email dans subscription.deleted"
        );
        break;
      }

      updateWebhook(email, {
        status: "canceled",
      });

      console.log(
        `[STRIPE WEBHOOK] customer.subscription.deleted => ❌ Abonnement annulé pour ${email}`
      );
      break;
    }

    // FACTURE IMMINENTE
    case "invoice.upcoming": {
      const upcoming = event.data.object as Stripe.Invoice;
      email = upcoming.customer_email ?? "";

      if (!email) {
        console.warn("⚠️ Email manquant dans invoice.upcoming :", upcoming.id);
        break;
      }

      console.log(
        `[STRIPE WEBHOOK] invoice.upcoming => 📅 Facture à venir pour ${email} - Montant : ${
          upcoming.amount_due / 100
        }€`
      );

      updateWebhook(email, {
        latestInvoiceId: upcoming.id,
      });
      break;
    }

    default:
      console.log(`ℹ️ ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
