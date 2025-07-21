import type Stripe from "stripe";

type WebhookEntry = {
  customerId: string;
  subscriptionId: string;
  email?: string;
  priceId: string;
  paymentMethodId?: string;
  latestInvoiceId?: string;
  status: Stripe.Subscription.Status;
  updatedAt: number;
};

export const webhookData: { [email: string]: WebhookEntry } = {};
