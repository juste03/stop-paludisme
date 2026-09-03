export type UserRole = "admin" | "vendeur" | "distributeur" | "stock_caissier";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  commission_rate?: number; // Pourcentage de commission personnalisé (ex: 15, 20)
  telephone?: string;
  statut?: "en_attente" | "valide" | "rejete";
  created_at?: string;
  avatar_url?: string;
}

export interface Produit {
  id: string;
  nom: string;
  type: "moustiquaire" | "consommable";
  prix: number; // Valeur numérique en USD
  devise: "USD" | "CDF";
  description: string;
  stock: number; // Stock central
}

export interface AgentStock {
  id: string;
  agent_id: string;
  produit_id: string;
  stock: number;
}

export interface ReassortRequest {
  id: string;
  agent_id: string;
  agent_nom: string;
  produit_id: string;
  produit_nom: string;
  quantite: number;
  statut: "en_attente" | "valide" | "refuse";
  date_creation: string;
  date_traitement?: string;
}

export interface Client {
  id: string;
  nom: string;
  telephone: string;
  quartier: string;
  adresse: string;
}

export interface VenteProduit {
  produit_id: string;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  devise: "USD" | "CDF";
}

export interface Vente {
  id: string;
  client_id?: string;
  client_nom: string;
  quartier: string;
  produits?: VenteProduit[]; // Liste multi-produits (jusqu'à 3)
  total: number; // Total principal converti ou brut en USD
  total_cdf?: number; // Total CDF si applicable
  date_vente: string;
  agent_id: string;
  agent_nom: string;
  type_paiement: "cash" | "credit" | "mpesa" | "airtel_money" | "orange_money";
  commission_taux: number;
  commission_montant: number; // en USD
  commission_montant_cdf?: number; // en CDF si consommables vendus
  taux_change?: number; // Taux de change lors de l'enregistrement de la vente
  statut_paiement: "en_attente" | "valide"; // Caissier valide
}

export interface BeneficiaireProduit {
  produit_id: string;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  devise: "USD" | "CDF";
}

export interface Beneficiaire {
  nom: string;
  telephone: string;
  adresse: string; // Ex: Avenue Kasongo, Quartier, Commune à Bukavu
  produits: BeneficiaireProduit[]; // Jusqu'à 3 catégories de produits
  total_usd: number;
  total_cdf: number;
  date_entree?: string;
}

export interface Versement {
  id: string;
  date: string;
  montant: number;
  devise: "USD" | "CDF";
  moyen_paiement: "cash" | "mpesa" | "airtel_money" | "orange_money";
}

export interface Protocole {
  id: string;
  institution: string;
  quartier: string;
  agent_id: string;
  agent_nom: string;
  date_creation: string;
  date_echeance: string; // Date d'échéance du protocole
  statut: "en_attente" | "valide" | "rejete";
  statut_paiement: "non_paye" | "partiel" | "total";
  beneficiaires: Beneficiaire[];
  versements: Versement[];
  notes?: string;
  montant_du_usd: number;
  montant_du_cdf: number;
  montant_paye_usd: number;
  montant_paye_cdf: number;
  taux_change: number; // Taux de change lors de l'enregistrement du protocole
  kit_type?: "standard" | "premium" | "liquide";
}

export interface FactureAgent {
  id: string;
  agent_id: string;
  agent_nom: string;
  mois: string; // ex: "2026-08" ou "Août 2026"
  date_creation: string;
  ventes_count: number;
  total_commission_usd: number;
  total_commission_cdf: number;
  statut: "en_attente" | "paye"; // Caissier valide
  date_paiement?: string;
  salaire_fixe?: number;
}

export interface StockArrival {
  id: string;
  produit_id: string;
  produit_nom: string;
  quantite: number;
  date_enregistrement: string;
  auteur_nom: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  date: string;
  auteur: string;
}

export interface AppNotification {
  id: string;
  titre: string;
  message: string;
  destinataire_role?: string; // 'all' | 'vendeur' | 'distributeur' | 'stock_caissier' | 'admin'
  destinataire_id?: string;
  auteur_nom: string;
  lu?: boolean;
  created_at: string;
  type?: "info" | "alerte" | "stock" | "reassort" | "validation";
}

export interface StatsQuartier {
  quartier: string;
  ca: number;
  ventes_nombre: number;
  clients_nombre: number;
}

export interface Stats {
  chiffre_affaires: number;
  total_ventes_cash: number;
  total_ventes_credit: number;
  total_ventes_mobile: number;
  total_commissions: number;
  nombre_ventes: number;
  nombre_clients: number;
  nombre_promesses: number;
  nombre_alertes: number;
  stats_quartiers: StatsQuartier[];
}

export interface DBStatus {
  supabaseConfigured: boolean;
  mode: string;
  details: string;
}
