/**
 * @file Test2.tsx
 * @component Test2
 * @description Simuler un paiement annuel Stripe avec une quantité personnalisable.
 */
"use client";

import { useState } from "react";

export const Test2 = () => {
  const [unitPrice, setUnitPrice] = useState<number>(50);
  const [quantity, setQuantity] = useState<number>(1);
  const [email, setEmail] = useState<string>("soso@mail.test"); // A remplacer de façon dynamique par le mail du user
  const yearly: string | undefined = process.env.NEXT_PUBLIC_YEARLY;

  const payYear = async () => {
    if (!yearly) {
      alert("La lookup key est manquante.");
      return;
    }
    console.log("paiement annuel déclenché");
    console.log("Lookup Key:", yearly);

    const res = await fetch("/api/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lookupKey: yearly,
        quantity,
        email,
      }),
    });
    const data = await res.json();
    if (data?.url) {
      localStorage.setItem("stripeUserEmail", email);
      window.location.href = data.url;
    } else {
      alert("Erreur lors de la création de la session.");
    }
  };

  return (
    <div className="mt-4">
      <h3>Test 2 : facturation annuelle</h3>
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
          onClick={payYear}
          className="cursor-pointer mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Simuler le paiement
        </button>
      </div>
    </div>
  );
};
