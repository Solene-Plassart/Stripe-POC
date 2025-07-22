# 🔐 Stripe – Intégration POC

Ce projet démontre l’intégration d’un système de facturation par abonnement avec Stripe. Il couvre la création de sessions de paiement, les tests en mode sandbox, la récupération des données utiles côté backend, et la gestion du cycle de vie des abonnements.

#### Sommaire

- [🏞️ Préparer l'environnement de test](#préparer-lenvironnement-de-test)
- [💲 Paiement test](#paiement-test-depuis-le-front-généré-par-stripe)
- [🧪 Simulations depuis le dashboard](#simulations-depuis-le-dashboard-stripe)
- [⚖️ Paiement au prorata](#paiement-au-prorata)
- [⏰ Anticiper un renouvellement](#anticiper-un-renouvellement-automatique)
- [✅ Résumé des fonctionnalités testées](#résumé-des-fonctionnalités-testées)

https://docs.stripe.com/api

---

## 🏞️ Préparer l'environnement de test

### Stripe CLI

- Installer stripe CLI (https://stripe.com/docs/stripe-cli)

- _$ stripe login_

  ➡️ Ouvre le navigateur pour associer un compte Stripe à la CLI

- _$ stripe listen --forward-to localhost:3000/api/webhook_

  ➡️ Crée un tunnel entre Stripe et le serveur local  
  ➡️ La CLI génère une clé webhook secrète (whsec...), à coller dans .env.local  
  ➡️ L'écouteur tourne : les événements reçus par Stripe seront transférés automatiquement au backend.

- _$ npm run dev_

  ( Dans un autre terminal)

⚠️ La **secret_key** ne se récupère pas avec la CLI, mais **sur le dashboard de Stripe**

🖋️ **Remarque** : en production, Stripe CLI n’est plus utilisée.  
 Les webhooks sont configurés directement depuis le Dashboard, en renseignant l’URL du backend distant et en sélectionnant les événements à écouter.  
 Stripe génère ensuite une clé webhook secrète dédiée à cette configuration.

---

### Événements à suivre :

| Événement                         | Description                          | Données utiles à exploiter (non exhaustif)                             |
| --------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| **checkout.session.completed**    | _Création d’une session de paiement_ | customerEmail, customerId, subscriptionId, priceId(metadata)           |
| **invoice.paid**                  | _Facture payée avec succès_          | invoiceId, amount_paid, payment_intent_id, status                      |
| **invoice.payment_failed**        | _Échec du paiement d’une facture_    | invoiceId, status, next_payment_attempt                                |
| **invoice.upcoming**              | _Facture bientôt générée_            | invoiceId, amountDue                                                   |
| **customer.subscription.created** | _Nouvel abonnement créé_             | subscriptionId, customerId, status, startDate, planInterval, invoiceId |
| **customer.subscription.updated** | _Abonnement modifié_                 | status, quantity                                                       |
| **customer.subscription.deleted** | _Abonnement supprimé_                | status                                                                 |

🖋️ **Remarque** : en mode test avec Stripe CLI, tous les événements sont écoutés par défaut.

---

### Variables d'environnement (.env.local)

```ts
_NEXT_PUBLIC_MONTHLY_=premium-monthly
_NEXT_PUBLIC_YEARLY_=premium-yearly
_STRIPE_SECRET_KEY_=sk_test...
_STRIPE_WEBHOOK_SECRET_=whsec...
_MONTHLY_STRIPE_CUSTOMER_ID_=cus...
_YEARLY_STRIPE_CUSTOMER_ID_=cus...
```

(Les variables _MONTHLY_STRIPE_CUSTOMER_ID_ et _YEARLY_STRIPE_CUSTOMER_ID_ sont les ID de clients créés dans Stripe, pour tester les abonnements mensuels et annuels. On les récupère sur le dashboard de Stripe.)

---

## 💲Paiement test, depuis le front généré par Stripe

### Cartes de test disponibles :

| Type   | Numéro carte        |
| ------ | ------------------- |
| Succès | 4242 4242 4242 4242 |
| Échec  | 4000 0000 0000 0341 |

- Expiration : n’importe quelle date future (ex : 03/28)
- CVC : n’importe quel code (ex : 111)

### Après le paiement :

- Redirection vers une page de succès ou d’échec (personnalisée côté client)
- Visualisation de la transaction dans le Dashboard Stripe

---

## 🧪 Simulations depuis le dashboard Stripe

### Simuler le comportement de l'abonnement au fil du temps

Dans le _Dashboard > Clients > Client test_, on peut avancer dans le temps (jours / semaines / mois), et observer la création des factures et l’évolution de l’abonnement.

---

### Simuler un échec de paiement

Dans le _Dashboard > Clients_ :

- Modifier la carte, pour avoir une carte de test qui échoue
- Avancer dans le temps (jours / semaines / mois)
- Observer la création des factures et l’évolution de l’abonnement

⚠️ **Par défaut, Stripe annule un abonnement après 4 échecs de paiement.**
Pour modifier ce comportement :
_Billing > Recouvrement de revenus > Relances_  
Modifier l’option : "En cas d’échec de toutes les tentatives de paiement, **marquer l’abonnement comme non payé**"

### Simuler une suspension d’abonnement

Dans _Billing > Recouvrement de revenus > Automatisations_, Stripe permet de définir des actions automatiques en cas d’échec de paiement d’un abonnement récurrent.  
Exemples : envoyer un rappel, suspendre temporairement, ou annuler l’abonnement.

⚠️ Cette automatisation ne s’applique **que** pour les factures récurrentes liées aux abonnements.

Dans le cas d’une **facture ponctuelle impayée** (ex : ajout de casques en cours d’abonnement), Stripe ne propose **aucune action automatisée**.

➡️ Pour gérer ces cas manuellement :

- Écouter l’événement **invoice.payment_failed**.
- Enregistrer en base un statut `impayé` et une **date d’annulation prévue**.
- Surveiller régulièrement l’évolution du paiement.

Pour cela on peut mettre en place un **cron job quotidien** (ex : avec node-cron) pour automatiser le suivi :

- Identifier les abonnements impayés dont la date limite est atteinte et les passer en `canceled`.
- Détecter les clients avec `status = canceled` pour bloquer les accès.
- Notifier les utilisateurs concernés (email, interface, tableau de bord) :
  - lorsqu’une annulation approche,
  - ou après une résiliation automatique.

---

## ⚖️ Paiement au prorata

Par défaut, Stripe applique un prorata si la quantité change en cours d’abonnement.  
Cependant, la facturation est différée (prise en compte au prochain cycle).

Pour forcer une **facturation immédiate** :

- Définir l'option `proration_behavior: create_prorations`
- Cela génère une **facture ponctuelle** dès le changement

⚠️ Si cette facture ponctuelle est impayée, Stripe bloque toute nouvelle modification liée à l’abonnement (ex : ajout d’un nouvel élément).

---

## ⏰ Anticiper un renouvellement automatique

Stripe **ne fournit pas de webhook** natif juste avant un renouvellement.

Alternative :

- Enregistrer `current_period_end` lors de la création de l’abonnement
- Mettre en place un cron job quotidien qui :
  - détecte les abonnements dont la période expire dans x jours
  - envoie un rappel à l’utilisateur pour l'avertir du prélèvement à venir

---

## ✅ Résumé des fonctionnalités testées

- Création de produit Stripe et récupération des `price_id` ✔
- Création de session de paiement ✔
- Paiements simulés avec cartes de test ✔
- Récupération et enregistrement des données clés d’abonnement ✔
- Configuration et écoute des webhooks ✔
- Gestion des proratas et modifications de quantité ✔
- Traitement des échecs de paiement et suspensions ✔
- Préparation au renouvellement automatique ✔

---
