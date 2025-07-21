import { Test1 } from "./components/Test1";
import { Test2 } from "./components/Test2";
import { Test3 } from "./components/Test3";
import { Test4 } from "./components/Test4";

export default function Home() {
  return (
    <div className="min-h-screen w-[800px] mx-auto my-0 p-14">
      <h1 className="text-center text-3xl font-bold mb-4">Tests Stripe</h1>
      <div className="px-4 mb-10">
        <h2>Facturation de contenu ajouté le jour de l&apos;abonnement</h2>
        <Test1 />
        <Test2 />
      </div>

      <div className="px-4 mb-10">
        <h2>
          Facturation au prorata de contenu ajouté durant l&apos;abonnement
        </h2>
        <Test3 />
        <Test4 />
      </div>
    </div>
  );
}
