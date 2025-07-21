"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function SuccessPage() {
  const fetchStripeData = async (email: string) => {
    const res = await fetch("/api/get-webhook-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const result = await res.json();
    if (result.found) {
      console.log("📦 Données Stripe récupérées :", result.data);
    } else {
      alert("Aucune donnée trouvée pour cet email.");
    }
  };

  useEffect(() => {
    const email = localStorage.getItem("stripeUserEmail");
    if (!email) return;
    fetchStripeData(email);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-700">Paiement réussi !</h1>
        <p className="mt-4 text-green-800">Merci pour votre abonnement 🎉</p>
        <Link
          href="/"
          className="mt-6 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
