import { NextRequest, NextResponse } from "next/server";
import { webhookData } from "@/lib/mock-db";
import { WebhookEntry } from "@/lib/mock-db";
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

  //Fonction d'updateWebhook
  function updateWebhook(email: string, partial: Partial<WebhookEntry>) {
    if (!email) {
      console.warn("Email vide reçu dans updateWebhook.");
      return;
    }

    const previous = webhookData[email] ?? {
      email,
    };

    webhookData[email] = {
      ...previous,
      ...partial,
      updatedAt: Date.now(),
    };
  }
  //Gestion des différents événements
  let email = "";
  switch (event.type) {
    //CHECKOUT SESSION
    case "checkout.session.completed":
      {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          "checkout.session.completed - ✅ Paiement réussi pour :",
          session.customer_email
        );

        const rawCustomer = session.customer;
        const rawSubscription = session.subscription;
        const rawInvoice = session.invoice;

        const customerId =
          typeof rawCustomer === "string"
            ? rawCustomer
            : rawCustomer?.id ?? null;

        const subscriptionId =
          typeof rawSubscription === "string"
            ? rawSubscription
            : rawSubscription?.id ?? null;

        const latestInvoiceId =
          typeof rawInvoice === "string"
            ? rawInvoice
            : rawInvoice?.id ?? undefined;

        email = session.customer_email ?? "";

        const priceId = session.metadata?.price_id ?? "";

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
        console.log("webhook Data:", webhookData);
      }
      break;

    //INVOICE PAID
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
        console.log(`💰 Paiement confirmé pour ${email}`, webhookData);
      }

      break;

    //INVOICE PAYMENT FAILED
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

        updateWebhook(email, {
          status: "past_due",
          suspensionEffectiveAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        });
        console.log(
          `❌ Paiement échoué pour ${email}, suspension prévue dans 30 jours.`
        );
      }

      break;

    //SUBSCRIPTION  CREATED
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

      const customer = await stripe.customers.retrieve(customerId);
      const email =
        typeof customer === "object" && "email" in customer
          ? customer.email
          : "";

      if (!email) {
        console.warn("Impossible de retrouver l'email du client");
        break;
      }

      // Ajoute l'email dans les metadata de la souscription
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
      });

      console.log(`✅ Subscription créée pour ${email}`);
      break;
    }

    //SUBSCRIPTION UPDATED
    case "customer.subscription.updated":
      {
        const sub = event.data.object as Stripe.Subscription;
        email = sub.metadata?.email ?? "";
        updateWebhook(email, {
          status: sub.status,
        });

        console.log(`🔄 Abonnement mis à jour pour ${email}`);
      }
      break;

    // SUBSCRIPTION DELETED
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      let email = sub.metadata?.email ?? "";

      // Si le metadata est vide, on récupère l'email via customerId
      if (!email && sub.customer) {
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

      console.log(`❌ Abonnement annulé pour ${email}`);
      break;
    }

    // INVOICE UPCOMING
    case "invoice.upcoming": {
      const upcoming = event.data.object as Stripe.Invoice;
      email = upcoming.customer_email ?? "";

      if (!email) {
        console.warn("⚠️ Email manquant dans invoice.upcoming :", upcoming.id);
        break;
      }

      console.log(
        `📅 Facture à venir pour ${email} - Montant : ${
          upcoming.amount_due / 100
        }€`
      );

      updateWebhook(email, {
        latestInvoiceId: upcoming.id,
      });
      break;
    }

    default:
      console.log(`ℹ️  Événement non géré : ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
