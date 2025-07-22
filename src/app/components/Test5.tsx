/**
 * @file Test5.tsx
 * @component Test5
 * @description Simuler la suppression d'une quantité (casques) d’un abonnement mensuel Stripe.
 */
"use client";
import { useState } from "react";

export const Test5 = () => {
  const [quantity, setQuantity] = useState<number>(1);

  const deleteHelmets = async () => {
    console.log(`Supprimer ${quantity} casques de l'abonnement mensuel`);
    try {
      const response = await fetch("/api/decrease-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityToRemove: quantity,
          key: "month",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur Stripe :", data.error);
        alert(`Erreur : ${data.error}`);
      } else {
        console.log("Réponse Stripe :", data);
        alert(`Quantité mise à jour : ${data.message}`);
      }
    } catch (err) {
      console.error("Erreur réseau :", err);
      alert("Erreur de connexion à Stripe");
    }
  };

  return (
    <div className="mt-4">
      <h3>Test 5 : abonnement mensuel</h3>
      <div className="flex gap-4 text-sm">
        <label>
          Quantité à retirer
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
            min={1}
          />
        </label>

        <button
          onClick={deleteHelmets}
          className="cursor-pointer mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Retirer
        </button>
      </div>
    </div>
  );
};
