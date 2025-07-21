import type Stripe from "stripe";

export type WebhookEntry = {
  customerId: string;
  subscriptionId: string;
  email?: string;
  priceId: string;
  paymentMethodId?: string;
  latestInvoiceId?: string;
  status: Stripe.Subscription.Status;
  updatedAt: number;
  currentPeriodEnd: Date;
  suspensionEffectiveAt?: Date;
};

export const webhookData: { [email: string]: WebhookEntry } = {};
