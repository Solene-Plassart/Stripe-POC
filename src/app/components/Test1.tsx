/**
 * @file Test1.tsx
 * @component Test1
 * @description Simuler un paiement mensuel Stripe avec quantité et prix paramétrables.
 */
"use client";

import { useState } from "react";

export const Test1 = () => {
  const [unitPrice, setUnitPrice] = useState<number>(5);
  const [quantity, setQuantity] = useState<number>(1);
  const [email, setEmail] = useState<string>("louka3@mail.test"); // A remplacer dynamiquement par le mail du user
  const monthly: string | undefined = process.env.NEXT_PUBLIC_MONTHLY;

  const payMonth = async () => {
    if (!monthly) {
      alert("La lookup key est manquante.");
      return;
    }
    alert("Paiement mensuel déclenché");

    const res = await fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lookupKey: monthly,
        quantity,
        email,
      }),
    });
    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Erreur lors de la création de la session.");
    }
  };

  return (
    <div className="mt-6">
      <h3>Test 1 : facturation mensuelle</h3>
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
          Quantité
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
            min={1}
          />
        </label>

        <button
          onClick={payMonth}
          className="cursor-pointer mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Simuler le paiement
        </button>
      </div>
      <div></div>
    </div>
  );
};
