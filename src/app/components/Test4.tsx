/**
 * @file Test4.tsx
 * @component Test4
 * @description Simuler l’ajout de quantité sur un abonnement annuel Stripe avec proration.
 */
"use client";

import { useState } from "react";

export const Test4 = () => {
  const [unitPrice, setUnitPrice] = useState<number>(50);
  const [quantity, setQuantity] = useState<number>(1);

  const payYearPartial = async () => {
    console.log("paiement annuel au prorata déclenché");

    try {
      const response = await fetch("/api/add-quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addedQuantity: quantity,
          key: "year",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur Stripe :", data.error);
        alert(`Erreur : ${data.error}`);
      } else {
        console.log("Réponse Stripe :", data);
        alert(
          `Quantité mise à jour : ${data.message}, nouvelle quantité : ${data.quantityNow}`
        );
      }
    } catch (err) {
      console.error("Erreur réseau :", err);
      alert("Erreur de connexion à Stripe");
    }
  };

  return (
    <div className="mt-4">
      <h3>Test 4 : facturation annuelle au prorata</h3>
      <div className="flex gap-4 text-sm">
        <label>
          Prix unitaire (€)
          <input
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
            min={0}
          />
        </label>

        <label>
          Quantité à rajouter
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
            min={1}
          />
        </label>

        <button
          onClick={payYearPartial}
          className="cursor-pointer mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Simuler le paiement
        </button>
      </div>
    </div>
  );
};
