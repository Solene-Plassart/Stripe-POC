/**
 * @file utils.ts
 */

import { WebhookEntry } from "./mock-db";
import { webhookData } from "./mock-db";

/**
 * Calcule la date de fin de période à partir d’un timestamp de départ.
 *
 * @param {number} startTimestamp - Timestamp UNIX en secondes.
 * @param {"month" | "year"} interval - Durée de l'abonnement (mois ou année).
 * @returns {Date} Date de fin de période.
 */
export const computeCurrentPeriodEnd = (
  startTimestamp: number,
  interval: "month" | "year"
): Date => {
  const startDate = new Date(startTimestamp * 1000);
  const endDate = new Date(startDate);

  if (interval === "month") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (interval === "year") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  return endDate;
};

/**
 * Met à jour les données d’un utilisateur dans `webhookData`.
 *
 * Si l'entrée n'existe pas encore, elle est créée avec l'email fourni.
 * Les champs partiels sont fusionnés avec les données existantes.
 *
 * @param {string} email - Email de l'utilisateur à mettre à jour (clé d'identification).
 * @param {Partial<WebhookEntry>} partial - Objet partiel contenant les champs à modifier.
 *
 * @returns {void} Ne retourne rien. Affiche un avertissement si l'email est vide.
 */
export function updateWebhook(email: string, partial: Partial<WebhookEntry>) {
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
