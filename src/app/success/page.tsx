"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [sessionData, setSessionData] = useState(null);

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
      </div>
    </div>
  );
}
