/**
 * @component SuccessPage
 * @description Affiche un message de validation du paiement avec un lien pour retourner à l'accueil.
 */
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SessionData {
  amount_total: number;
  customer: {
    email: string;
    id: string;
    currency: string;
  };
  metadata: {
    price_id: string;
  };
  subscription: {
    quantity: number;
    status: string;
    plan: {
      created: number;
      interval: "month" | "year";
    };
  };
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      const res = await fetch(`/api/get-session?session_id=${sessionId}`);
      const data = await res.json();
      setSessionData(data);
      console.log("session data:", data);
    };

    fetchSession();
  }, [sessionId]);

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
        {sessionData && (
          <div className="text-start mt-8 flex flex-col gap-2">
            <p>
              <b>Somme réglée : </b>
              {sessionData.amount_total / 100} {sessionData.customer.currency}{" "}
              pour {sessionData.subscription.quantity} casques (price id :{" "}
              {sessionData.metadata.price_id}),
            </p>
            <p>
              <b>Client :</b> {sessionData.customer.email}, <b>identifiant :</b>{" "}
              {sessionData.customer.id}
            </p>
            <p>
              <b> Date de début de l&apos;abonnement :</b>{" "}
              {new Date(
                sessionData.subscription.plan.created * 1000
              ).toLocaleDateString("fr-FR")}
              , période de renouvellement :{" "}
              {sessionData.subscription.plan.interval}
            </p>
            <p>
              <b>Statut de l&apos;abonnement :</b>{" "}
              {sessionData.subscription.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
