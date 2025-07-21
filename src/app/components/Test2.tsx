"use client";

import { useState } from "react";

export const Test2 = () => {
  const [unitPrice, setUnitPrice] = useState<number>(50);
  const [quantity, setQuantity] = useState<number>(1);

  const payYear = async () => {
    console.log("paiement annuel déclenché");
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
