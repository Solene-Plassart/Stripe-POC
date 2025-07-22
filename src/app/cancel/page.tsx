/**
 * @component CancelPage
 * @description Affiche un message d'annulation de paiement avec un lien pour retourner à l'accueil.
 */
import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-700">Paiement annulé</h1>
        <p className="mt-4 text-red-800">
          Vous pouvez réessayer à tout moment.
        </p>
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
