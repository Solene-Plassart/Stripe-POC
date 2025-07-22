/**
 * @file mock-db.ts
 * @description
 * Stockage temporaire simulé des données clients reçues via les webhooks Stripe.
 * Environnement : développement / test uniquement.
 *
 * Dans ce contexte, les données sont indexées par `email` car il n'y a pas de vraie base de données.
 * L'objet `webhookData` sert à simuler un stockage en mémoire pour suivre l’état des abonnements.
 *
 * En production :
 * - Table `customer`.
 * - L'indexation se fera via `customerId` Stripe (clé étrangère vers les utilisateurs).
 * - Le champ `email` deviendra inutile car l'association client --> Stripe sera faite avec `customerId`.
 */

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
