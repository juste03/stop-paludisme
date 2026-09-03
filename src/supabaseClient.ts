import { createClient } from "@supabase/supabase-js";
import {
  User,
  Produit,
  AgentStock,
  ReassortRequest,
  Client,
  Vente,
  Protocole,
  FactureAgent,
  StockArrival,
  AuditLog,
  AppNotification,
  Stats,
  UserRole
} from "./types";

// ============================================================================
// CONFIGURATION SUPABASE (STOP PALUDISME - BUKAVU)
// ============================================================================
export const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://rgbdhanxswglgflbkazs.supabase.co";

export const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_LLHVEDNmE1jPQ9cRMGWMoQ_X7FxDg1o";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  (SUPABASE_URL.startsWith("http://") || SUPABASE_URL.startsWith("https://"))
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// ============================================================================
// LOCAL STORAGE SEED & CACHE (Pour fonctionnement autonome 100% Mobile & Offline)
// ============================================================================

const STORAGE_KEYS = {
  USERS: "sp_users_v2",
  PRODUITS: "sp_produits_v2",
  CLIENTS: "sp_clients_v2",
  VENTES: "sp_ventes_v2",
  PROTOCOLES: "sp_protocoles_v2",
  AGENT_STOCKS: "sp_agent_stocks_v2",
  REASSORTS: "sp_reassorts_v2",
  STOCK_ARRIVALS: "sp_stock_arrivals_v2",
  AUDIT_LOGS: "sp_audit_logs_v2",
  FACTURES: "sp_factures_v2",
  NOTIFICATIONS: "sp_notifications_v2",
  EXCHANGE_RATE: "sp_exchange_rate_v2"
};

// Données initiales de démarrage
const SEED_USERS: User[] = [
  {
    id: "u-admin",
    name: "Justin Ciza (Admin)",
    email: "admin@stoppaludisme.cd",
    role: "admin",
    statut: "valide",
    commission_rate: 0,
    telephone: "+243999000001"
  },
  {
    id: "u-vendeur",
    name: "Bahati Murhula (Vendeur)",
    email: "vendeur@stoppaludisme.cd",
    role: "vendeur",
    statut: "valide",
    commission_rate: 15,
    telephone: "+243999000002"
  },
  {
    id: "u-distrib",
    name: "Kavira Masika (Distributeur)",
    email: "distributeur@stoppaludisme.cd",
    role: "distributeur",
    statut: "valide",
    commission_rate: 20,
    telephone: "+243999000003"
  },
  {
    id: "u-stock",
    name: "Leopold Mushamuka (Stock & Caisse)",
    email: "stock@stoppaludisme.cd",
    role: "stock_caissier",
    statut: "valide",
    commission_rate: 0,
    telephone: "+243999000004"
  },
  {
    id: "u-caissier",
    name: "Florence Nabintu (Stock & Caisse)",
    email: "caissier@stoppaludisme.cd",
    role: "stock_caissier",
    statut: "valide",
    commission_rate: 0,
    telephone: "+243999000005"
  }
];

const SEED_PRODUITS: Produit[] = [
  {
    id: "me_std",
    nom: "Kit Moustiquaire Électrique Standard",
    type: "moustiquaire",
    prix: 5.0,
    devise: "USD",
    description: "Moustiquaire électrique rechargeable standard haute efficacité contre l'anophèle.",
    stock: 240
  },
  {
    id: "me_prem",
    nom: "Kit Moustiquaire Électrique Premium",
    type: "moustiquaire",
    prix: 10.0,
    devise: "USD",
    description: "Modèle renforcé avec armature articulée, support mural et batterie longue durée.",
    stock: 115
  },
  {
    id: "me_pro",
    nom: "Kit Moustiquaire Électrique Professionnelle",
    type: "moustiquaire",
    prix: 20.0,
    devise: "USD",
    description: "Version clinique et centres hospitaliers grande surface avec double grille de sécurité.",
    stock: 45
  },
  {
    id: "c_liq",
    nom: "Recharge Liquide Anti-Moustique (45 Nuits)",
    type: "consommable",
    prix: 3000.0,
    devise: "CDF",
    description: "Diffuseur liquide répulsif longue durée formule approuvée OMS.",
    stock: 500
  },
  {
    id: "c_plq",
    nom: "Pack Plaquettes Répulsives (Boîte de 30)",
    type: "consommable",
    prix: 5000.0,
    devise: "CDF",
    description: "Plaquettes à diffusion lente pour diffuseurs électriques classiques.",
    stock: 320
  }
];

const SEED_CLIENTS: Client[] = [
  { id: "c-1", nom: "Maman Zawadi", telephone: "+243998765432", quartier: "Kadutu", adresse: "Av. du Marché n°14" },
  { id: "c-2", nom: "Hôtel Panorama", telephone: "+243812345678", quartier: "Ibanda", adresse: "Boulevard Lumumba n°88" },
  { id: "c-3", nom: "Centre Hospitalier Panzi", telephone: "+243990112233", quartier: "Panzi", adresse: "Avenue Principale" },
  { id: "c-4", nom: "École Primaire Matendo", telephone: "+243854123987", quartier: "Kadutu", adresse: "Rue de la Mission" },
  { id: "c-5", nom: "Pharmacie du Lac", telephone: "+243977889900", quartier: "Ibanda", adresse: "Av. Maniema n°05" }
];

const SEED_AGENT_STOCKS: AgentStock[] = [
  { id: "as-1", agent_id: "u-vendeur", produit_id: "me_std", stock: 35 },
  { id: "as-2", agent_id: "u-vendeur", produit_id: "me_prem", stock: 15 },
  { id: "as-3", agent_id: "u-vendeur", produit_id: "c_liq", stock: 40 },
  { id: "as-4", agent_id: "u-distrib", produit_id: "me_std", stock: 60 },
  { id: "as-5", agent_id: "u-distrib", produit_id: "me_prem", stock: 25 },
  { id: "as-6", agent_id: "u-distrib", produit_id: "c_plq", stock: 50 }
];

const SEED_VENTES: Vente[] = [
  {
    id: "v-101",
    client_id: "c-1",
    client_nom: "Maman Zawadi",
    quartier: "Kadutu",
    produits: [{ produit_id: "me_std", produit_nom: "Kit Moustiquaire Électrique Standard", quantite: 2, prix_unitaire: 5.0, devise: "USD" }],
    total: 10.0,
    total_cdf: 28500,
    date_vente: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    agent_id: "u-vendeur",
    agent_nom: "Bahati Murhula (Vendeur)",
    type_paiement: "cash",
    commission_taux: 15,
    commission_montant: 1.5,
    commission_montant_cdf: 4275,
    taux_change: 2850,
    statut_paiement: "valide"
  },
  {
    id: "v-102",
    client_id: "c-2",
    client_nom: "Hôtel Panorama",
    quartier: "Ibanda",
    produits: [
      { produit_id: "me_prem", produit_nom: "Kit Moustiquaire Électrique Premium", quantite: 4, prix_unitaire: 10.0, devise: "USD" },
      { produit_id: "c_liq", produit_nom: "Recharge Liquide Anti-Moustique (45 Nuits)", quantite: 10, prix_unitaire: 3000, devise: "CDF" }
    ],
    total: 50.53,
    total_cdf: 144000,
    date_vente: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    agent_id: "u-distrib",
    agent_nom: "Kavira Masika (Distributeur)",
    type_paiement: "mpesa",
    commission_taux: 20,
    commission_montant: 10.11,
    commission_montant_cdf: 28800,
    taux_change: 2850,
    statut_paiement: "valide"
  }
];

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    titre: "Bienvenue sur Stop Paludisme",
    message: "Le système autonome de gestion commerciale et des stocks est synchronisé.",
    destinataire_role: "all",
    auteur_nom: "Justin Ciza (Admin)",
    lu: false,
    created_at: new Date().toISOString(),
    type: "info"
  },
  {
    id: "notif-2",
    titre: "Objectifs de vente du mois",
    message: "Rappel à tous les agents vendeurs : prime de 15% garantie et bonus à partir de 50 kits.",
    destinataire_role: "all",
    auteur_nom: "Justin Ciza (Admin)",
    lu: false,
    created_at: new Date().toISOString(),
    type: "info"
  }
];

// Fonctions génériques de persistance
function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Lecture localStorage [${key}] échouée:`, e);
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`Écriture localStorage [${key}] échouée:`, e);
  }
}

// Initialisation idempotente du storage
if (!localStorage.getItem(STORAGE_KEYS.USERS)) setStored(STORAGE_KEYS.USERS, SEED_USERS);
if (!localStorage.getItem(STORAGE_KEYS.PRODUITS)) setStored(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) setStored(STORAGE_KEYS.CLIENTS, SEED_CLIENTS);
if (!localStorage.getItem(STORAGE_KEYS.AGENT_STOCKS)) setStored(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
if (!localStorage.getItem(STORAGE_KEYS.VENTES)) setStored(STORAGE_KEYS.VENTES, SEED_VENTES);
if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) setStored(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
if (!localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE)) setStored(STORAGE_KEYS.EXCHANGE_RATE, 2850);

// ============================================================================
// SERVICE BASE DE DONNÉES & MÉTIER (AUTONOME & HYBRIDE SUPABASE / LOCAL)
// ============================================================================

export const db = {
  // --------------------------------------------------------------------------
  // AUTHENTIFICATION & COMPTES
  // --------------------------------------------------------------------------
  async loginWithEmail(email: string, pass: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Tenter la connexion Supabase native si client disponible
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass
        });
        if (!error && data?.user) {
          // Récupérer le profil
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (profile) {
            const loggedUser: User = {
              id: profile.id,
              email: profile.email || cleanEmail,
              name: profile.name || profile.nom || cleanEmail.split("@")[0],
              role: (profile.role as UserRole) || "vendeur",
              commission_rate: profile.commission_rate ?? (profile.role === "distributeur" ? 20 : 15),
              statut: profile.statut || "valide",
              telephone: profile.telephone || ""
            };
            // Cache local
            const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
            const existsIdx = users.findIndex(u => u.id === loggedUser.id);
            if (existsIdx >= 0) users[existsIdx] = loggedUser;
            else users.push(loggedUser);
            setStored(STORAGE_KEYS.USERS, users);
            return loggedUser;
          }
        }
      } catch (e) {
        console.warn("Connexion Supabase non disponible, fallback local:", e);
      }
    }

    // 2. Fallback base locale (Toujours fonctionnel pour démo et offline)
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const found = users.find(
      u => u.email.toLowerCase() === cleanEmail || (u.telephone && u.telephone === cleanEmail)
    );

    if (found) {
      if (found.statut === "rejete") {
        throw new Error("Votre demande d'accès a été rejetée par l'administration.");
      }
      return found;
    }

    // Identifiant inconnu
    throw new Error("Identifiant ou mot de passe incorrect. Vérifiez vos coordonnées.");
  },

  async registerUser(params: {
    name: string;
    email: string;
    telephone: string;
    password?: string;
    regType: "email" | "phone";
  }): Promise<User> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.telephone.trim();

    const newUser: User = {
      id: "u-" + Math.random().toString(36).substring(2, 9),
      name: params.name.trim(),
      email: cleanEmail || `${cleanPhone.replace(/[^0-9]/g, "")}@mobile.stoppaludisme.cd`,
      telephone: cleanPhone,
      role: "vendeur", // Par défaut vendeur jusqu'à validation
      statut: "en_attente", // Validation Admin requise
      commission_rate: 15,
      created_at: new Date().toISOString()
    };

    // Tenter inscription Supabase
    if (supabase && params.password && cleanEmail) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              name: params.name,
              telephone: cleanPhone,
              role: "vendeur",
              statut: "en_attente"
            }
          }
        });
        if (!error && data?.user) {
          newUser.id = data.user.id;
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: cleanEmail,
            name: params.name,
            telephone: cleanPhone,
            role: "vendeur",
            statut: "en_attente",
            commission_rate: 15
          });
        }
      } catch (e) {
        console.warn("Inscription Supabase auth non exécutée:", e);
      }
    }

    // Sauvegarder localement
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    // Vérifier doublon
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      throw new Error("Cette adresse email est déjà enregistrée.");
    }
    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);

    // Créer une notification interne pour l'Admin
    await this.sendNotification({
      titre: "Nouvelle inscription d'agent",
      message: `${newUser.name} (${newUser.telephone || newUser.email}) s'est inscrit et attend validation.`,
      destinataire_role: "admin",
      auteur_nom: "Système",
      type: "validation"
    });

    return newUser;
  },

  async resetPassword(email: string): Promise<boolean> {
    if (supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: window.location.origin
        });
        if (!error) return true;
      } catch (e) {
        console.warn("Reset Supabase password:", e);
      }
    }
    // Simulation réussie
    return true;
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("Utilisateur introuvable");

    users[idx] = { ...users[idx], ...data };
    setStored(STORAGE_KEYS.USERS, users);

    // Mettre à jour dans Supabase si connecté
    if (supabase) {
      try {
        await supabase.from("profiles").update(data).eq("id", userId);
      } catch (e) {
        console.warn("Supabase update profile error:", e);
      }
    }

    return users[idx];
  },

  // --------------------------------------------------------------------------
  // GESTION DES UTILISATEURS & VALIDATION ADMIN
  // --------------------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("profiles").select("*");
        if (!error && data && data.length > 0) {
          const mapped: User[] = data.map(d => ({
            id: d.id,
            email: d.email || "",
            name: d.name || d.nom || "Agent",
            role: (d.role as UserRole) || "vendeur",
            commission_rate: d.commission_rate ?? (d.role === "distributeur" ? 20 : 15),
            telephone: d.telephone || "",
            statut: d.statut || "valide",
            created_at: d.created_at
          }));
          setStored(STORAGE_KEYS.USERS, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn("Supabase getUsers fallback local:", e);
      }
    }
    return getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
  },

  async validateUser(userId: string, role: UserRole, commissionRate: number): Promise<User> {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("Utilisateur introuvable");

    users[idx].statut = "valide";
    users[idx].role = role;
    users[idx].commission_rate = commissionRate;
    setStored(STORAGE_KEYS.USERS, users);

    if (supabase) {
      try {
        await supabase.from("profiles").update({
          statut: "valide",
          role,
          commission_rate: commissionRate
        }).eq("id", userId);
      } catch (e) {
        console.warn("Supabase validateUser error:", e);
      }
    }

    // Alerter l'agent via le système de notification
    await this.sendNotification({
      titre: "Compte validé !",
      message: `Votre compte a été approuvé avec le rôle "${role}" et un taux de commission de ${commissionRate}%.`,
      destinataire_id: userId,
      auteur_nom: "Administration",
      type: "validation"
    });

    return users[idx];
  },

  async rejectUser(userId: string): Promise<User> {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("Utilisateur introuvable");

    users[idx].statut = "rejete";
    setStored(STORAGE_KEYS.USERS, users);

    if (supabase) {
      try {
        await supabase.from("profiles").update({ statut: "rejete" }).eq("id", userId);
      } catch (e) {
        console.warn("Supabase rejectUser error:", e);
      }
    }

    return users[idx];
  },

  async updateCommissionRate(userId: string, rate: number): Promise<User> {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("Utilisateur introuvable");

    users[idx].commission_rate = rate;
    setStored(STORAGE_KEYS.USERS, users);

    if (supabase) {
      try {
        await supabase.from("profiles").update({ commission_rate: rate }).eq("id", userId);
      } catch (e) {
        console.warn("Supabase updateCommission error:", e);
      }
    }

    return users[idx];
  },

  async deleteUser(userId: string): Promise<void> {
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const filtered = users.filter(u => u.id !== userId);
    setStored(STORAGE_KEYS.USERS, filtered);

    if (supabase) {
      try {
        await supabase.from("profiles").delete().eq("id", userId);
      } catch (e) {
        console.warn("Supabase deleteUser error:", e);
      }
    }
  },

  // --------------------------------------------------------------------------
  // PRODUITS DU CATALOGUE
  // --------------------------------------------------------------------------
  async getProduits(): Promise<Produit[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("produits").select("*");
        if (!error && data && data.length > 0) {
          setStored(STORAGE_KEYS.PRODUITS, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getProduits fallback:", e);
      }
    }
    return getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
  },

  async createProduit(p: Omit<Produit, "id">): Promise<Produit> {
    const newP: Produit = {
      id: "prod-" + Math.random().toString(36).substring(2, 9),
      ...p
    };
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    prods.push(newP);
    setStored(STORAGE_KEYS.PRODUITS, prods);

    if (supabase) {
      try {
        await supabase.from("produits").insert(newP);
      } catch (e) {
        console.warn("Supabase insert produit error:", e);
      }
    }

    return newP;
  },

  async updateProduit(id: string, p: Partial<Produit>): Promise<Produit> {
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const idx = prods.findIndex(x => x.id === id);
    if (idx === -1) throw new Error("Produit introuvable");

    prods[idx] = { ...prods[idx], ...p };
    setStored(STORAGE_KEYS.PRODUITS, prods);

    if (supabase) {
      try {
        await supabase.from("produits").update(p).eq("id", id);
      } catch (e) {
        console.warn("Supabase update produit error:", e);
      }
    }

    return prods[idx];
  },

  async deleteProduit(id: string): Promise<void> {
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const filtered = prods.filter(x => x.id !== id);
    setStored(STORAGE_KEYS.PRODUITS, filtered);

    if (supabase) {
      try {
        await supabase.from("produits").delete().eq("id", id);
      } catch (e) {
        console.warn("Supabase delete produit error:", e);
      }
    }
  },

  // --------------------------------------------------------------------------
  // CLIENTS
  // --------------------------------------------------------------------------
  async getClients(): Promise<Client[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("clients").select("*");
        if (!error && data && data.length > 0) {
          setStored(STORAGE_KEYS.CLIENTS, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getClients fallback:", e);
      }
    }
    return getStored<Client[]>(STORAGE_KEYS.CLIENTS, SEED_CLIENTS);
  },

  async createClient(c: Omit<Client, "id">): Promise<Client> {
    const newC: Client = {
      id: "c-" + Math.random().toString(36).substring(2, 9),
      ...c
    };
    const clients = getStored<Client[]>(STORAGE_KEYS.CLIENTS, SEED_CLIENTS);
    clients.push(newC);
    setStored(STORAGE_KEYS.CLIENTS, clients);

    if (supabase) {
      try {
        await supabase.from("clients").insert(newC);
      } catch (e) {
        console.warn("Supabase insert client error:", e);
      }
    }

    return newC;
  },

  // --------------------------------------------------------------------------
  // STOCKS AGENTS & DÉPÔTS FIXES
  // --------------------------------------------------------------------------
  async getAgentStocks(agentId?: string): Promise<AgentStock[]> {
    if (supabase) {
      try {
        let query = supabase.from("agent_stocks").select("*");
        if (agentId) query = query.eq("agent_id", agentId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          if (!agentId) setStored(STORAGE_KEYS.AGENT_STOCKS, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getAgentStocks fallback:", e);
      }
    }
    const all = getStored<AgentStock[]>(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
    if (agentId) return all.filter(s => s.agent_id === agentId);
    return all;
  },

  async transferStock(agentId: string, produitId: string, quantite: number, auteurNom: string): Promise<void> {
    const parsedQty = parseInt(quantite as any);
    if (isNaN(parsedQty) || parsedQty <= 0) throw new Error("La quantité doit être supérieure à 0");

    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const prod = prods.find(p => p.id === produitId);
    if (!prod) throw new Error("Produit central introuvable");
    if ((prod.stock || 0) < parsedQty) {
      throw new Error(`Stock central insuffisant (${prod.stock} PCS disponible).`);
    }

    // Déduire du dépôt central
    prod.stock -= parsedQty;
    setStored(STORAGE_KEYS.PRODUITS, prods);

    // Ajouter au stock de l'agent
    const agentStocks = getStored<AgentStock[]>(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
    const idx = agentStocks.findIndex(s => s.agent_id === agentId && s.produit_id === produitId);
    if (idx !== -1) {
      agentStocks[idx].stock += parsedQty;
    } else {
      agentStocks.push({
        id: "as-" + Math.random().toString(36).substring(2, 9),
        agent_id: agentId,
        produit_id: produitId,
        stock: parsedQty
      });
    }
    setStored(STORAGE_KEYS.AGENT_STOCKS, agentStocks);

    // Ajouter un audit log
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const agentObj = users.find(u => u.id === agentId);
    const agentName = agentObj ? agentObj.name : "Agent de terrain";

    await this.addAuditLog({
      action: "Livraison Agent",
      details: `Livraison directe de ${parsedQty} PCS de ${prod.nom} du dépôt central vers ${agentName} par ${auteurNom}.`,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      auteur: auteurNom
    });

    if (supabase) {
      try {
        await supabase.from("produits").update({ stock: prod.stock }).eq("id", produitId);
        const sTarget = agentStocks.find(s => s.agent_id === agentId && s.produit_id === produitId);
        if (sTarget) await supabase.from("agent_stocks").upsert(sTarget);
      } catch (e) {
        console.warn("Supabase transferStock error:", e);
      }
    }
  },

  // --------------------------------------------------------------------------
  // DEMANDES DE RÉASSORT
  // --------------------------------------------------------------------------
  async getReassorts(agentId?: string): Promise<ReassortRequest[]> {
    if (supabase) {
      try {
        let query = supabase.from("reassorts").select("*");
        if (agentId) query = query.eq("agent_id", agentId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          if (!agentId) setStored(STORAGE_KEYS.REASSORTS, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getReassorts fallback:", e);
      }
    }
    const all = getStored<ReassortRequest[]>(STORAGE_KEYS.REASSORTS, []);
    if (agentId) return all.filter(r => r.agent_id === agentId);
    return all;
  },

  async createReassort(params: {
    agent_id: string;
    agent_nom: string;
    produit_id: string;
    quantite: number;
  }): Promise<ReassortRequest> {
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const prod = prods.find(p => p.id === params.produit_id);
    if (!prod) throw new Error("Produit introuvable");

    const newReq: ReassortRequest = {
      id: "re-" + Math.random().toString(36).substring(2, 9),
      agent_id: params.agent_id,
      agent_nom: params.agent_nom,
      produit_id: params.produit_id,
      produit_nom: prod.nom,
      quantite: parseInt(params.quantite as any),
      statut: "en_attente",
      date_creation: new Date().toISOString().split("T")[0]
    };

    const all = getStored<ReassortRequest[]>(STORAGE_KEYS.REASSORTS, []);
    all.push(newReq);
    setStored(STORAGE_KEYS.REASSORTS, all);

    if (supabase) {
      try {
        await supabase.from("reassorts").insert(newReq);
      } catch (e) {
        console.warn("Supabase insert reassort error:", e);
      }
    }

    return newReq;
  },

  async updateReassortStatut(id: string, statut: "valide" | "refuse"): Promise<ReassortRequest> {
    const all = getStored<ReassortRequest[]>(STORAGE_KEYS.REASSORTS, []);
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) throw new Error("Demande de réassort introuvable");

    const reqItem = all[idx];

    if (statut === "valide") {
      const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
      const pIdx = prods.findIndex(p => p.id === reqItem.produit_id);
      if (pIdx === -1) throw new Error("Produit central introuvable");
      if (prods[pIdx].stock < reqItem.quantite) {
        throw new Error("Stock central insuffisant pour valider ce réassort.");
      }

      // Déduire du dépôt central
      prods[pIdx].stock -= reqItem.quantite;
      setStored(STORAGE_KEYS.PRODUITS, prods);

      // Créditer le stock de l'agent
      const agentStocks = getStored<AgentStock[]>(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
      const asIdx = agentStocks.findIndex(s => s.agent_id === reqItem.agent_id && s.produit_id === reqItem.produit_id);
      if (asIdx !== -1) {
        agentStocks[asIdx].stock += reqItem.quantite;
      } else {
        agentStocks.push({
          id: "as-" + Math.random().toString(36).substring(2, 9),
          agent_id: reqItem.agent_id,
          produit_id: reqItem.produit_id,
          stock: reqItem.quantite
        });
      }
      setStored(STORAGE_KEYS.AGENT_STOCKS, agentStocks);

      reqItem.statut = "valide";
    } else {
      reqItem.statut = "refuse";
    }

    reqItem.date_traitement = new Date().toISOString().split("T")[0];
    setStored(STORAGE_KEYS.REASSORTS, all);

    if (supabase) {
      try {
        await supabase.from("reassorts").update({
          statut: reqItem.statut,
          date_traitement: reqItem.date_traitement
        }).eq("id", id);
      } catch (e) {
        console.warn("Supabase updateReassortStatut error:", e);
      }
    }

    return reqItem;
  },

  // --------------------------------------------------------------------------
  // VENTES & COMMISSIONS MÉTIER (15% Vendeur, 20% Distributeur)
  // --------------------------------------------------------------------------
  async getVentes(agentId?: string): Promise<Vente[]> {
    if (supabase) {
      try {
        let query = supabase.from("ventes").select("*");
        if (agentId) query = query.eq("agent_id", agentId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          if (!agentId) setStored(STORAGE_KEYS.VENTES, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getVentes fallback:", e);
      }
    }
    const all = getStored<Vente[]>(STORAGE_KEYS.VENTES, SEED_VENTES);
    if (agentId) return all.filter(v => v.agent_id === agentId);
    return all;
  },

  async createVente(body: {
    client_id?: string;
    client_nom: string;
    quartier: string;
    client_telephone?: string;
    client_adresse?: string;
    produits: Array<{ produit_id: string; quantite: number }>;
    type_paiement: "cash" | "credit" | "mpesa" | "airtel_money" | "orange_money";
    agent_id: string;
    agent_nom: string;
    commission_taux_custom?: number;
  }): Promise<Vente> {
    const exchangeRate = await this.getExchangeRate();
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const agentStocks = getStored<AgentStock[]>(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);

    // 1. Déduction automatique du stock de l'agent
    for (const item of body.produits) {
      const aStock = agentStocks.find(s => s.agent_id === body.agent_id && s.produit_id === item.produit_id);
      if (!aStock || aStock.stock < item.quantite) {
        const pNom = prods.find(p => p.id === item.produit_id)?.nom || item.produit_id;
        throw new Error(`Stock personnel insuffisant pour ${pNom} (Disponible: ${aStock?.stock || 0} PCS)`);
      }
    }

    for (const item of body.produits) {
      const idx = agentStocks.findIndex(s => s.agent_id === body.agent_id && s.produit_id === item.produit_id);
      if (idx !== -1) {
        agentStocks[idx].stock -= item.quantite;
      }
    }
    setStored(STORAGE_KEYS.AGENT_STOCKS, agentStocks);

    // 2. Calcul du total financier et formatage des articles
    let total_usd = 0;
    let total_cdf = 0;
    const processedProds = [];

    for (const item of body.produits) {
      const dbP = prods.find(p => p.id === item.produit_id);
      if (!dbP) continue;
      const itemTotal = dbP.prix * item.quantite;
      if (dbP.devise === "USD") {
        total_usd += itemTotal;
        total_cdf += itemTotal * exchangeRate;
      } else {
        total_cdf += itemTotal;
        total_usd += itemTotal / exchangeRate;
      }
      processedProds.push({
        produit_id: dbP.id,
        produit_nom: dbP.nom,
        quantite: item.quantite,
        prix_unitaire: dbP.prix,
        devise: dbP.devise
      });
    }

    // 3. Calcul de la commission métier (15% vendeur, 20% distributeur)
    const agentObj = users.find(u => u.id === body.agent_id);
    const commissionTaux = agentObj?.commission_rate !== undefined
      ? agentObj.commission_rate
      : (body.commission_taux_custom !== undefined
          ? body.commission_taux_custom
          : (agentObj?.role === "distributeur" ? 20 : 15));

    const commissionUSD = total_usd * (commissionTaux / 100);
    const commissionCDF = total_cdf * (commissionTaux / 100);

    // 4. Enregistrement automatique du client si nouveau
    let finalClientId = body.client_id;
    if (!finalClientId && body.client_nom) {
      const newClient = await this.createClient({
        nom: body.client_nom,
        telephone: body.client_telephone || "Non spécifié",
        quartier: body.quartier || "Ibanda",
        adresse: body.client_adresse || ""
      });
      finalClientId = newClient.id;
    }

    const newVente: Vente = {
      id: "v-" + Math.random().toString(36).substring(2, 9),
      client_id: finalClientId,
      client_nom: body.client_nom || "Client de passage",
      quartier: body.quartier || "Ibanda",
      produits: processedProds,
      total: parseFloat(total_usd.toFixed(2)),
      total_cdf: Math.round(total_cdf),
      date_vente: new Date().toISOString().split("T")[0],
      agent_id: body.agent_id,
      agent_nom: body.agent_nom,
      type_paiement: body.type_paiement || "cash",
      commission_taux: commissionTaux,
      commission_montant: parseFloat(commissionUSD.toFixed(2)),
      commission_montant_cdf: Math.round(commissionCDF),
      taux_change: exchangeRate,
      statut_paiement: "en_attente" // Doit être validé par la caisse
    };

    const ventes = getStored<Vente[]>(STORAGE_KEYS.VENTES, SEED_VENTES);
    ventes.unshift(newVente);
    setStored(STORAGE_KEYS.VENTES, ventes);

    if (supabase) {
      try {
        await supabase.from("ventes").insert(newVente);
      } catch (e) {
        console.warn("Supabase insert vente error:", e);
      }
    }

    return newVente;
  },

  async updateVenteStatut(id: string, statut: "valide"): Promise<Vente> {
    const ventes = getStored<Vente[]>(STORAGE_KEYS.VENTES, SEED_VENTES);
    const idx = ventes.findIndex(v => v.id === id);
    if (idx === -1) throw new Error("Vente introuvable");

    ventes[idx].statut_paiement = statut;
    setStored(STORAGE_KEYS.VENTES, ventes);

    if (supabase) {
      try {
        await supabase.from("ventes").update({ statut_paiement: statut }).eq("id", id);
      } catch (e) {
        console.warn("Supabase updateVenteStatut error:", e);
      }
    }

    return ventes[idx];
  },

  // --------------------------------------------------------------------------
  // PROTOCOLES D'ACCORD INSTITUTIONNELS
  // --------------------------------------------------------------------------
  async getProtocoles(agentId?: string): Promise<Protocole[]> {
    if (supabase) {
      try {
        let query = supabase.from("protocoles").select("*");
        if (agentId) query = query.eq("agent_id", agentId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          if (!agentId) setStored(STORAGE_KEYS.PROTOCOLES, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getProtocoles fallback:", e);
      }
    }
    const all = getStored<Protocole[]>(STORAGE_KEYS.PROTOCOLES, []);
    if (agentId) return all.filter(p => p.agent_id === agentId);
    return all;
  },

  async createProtocole(params: {
    institution: string;
    quartier: string;
    agent_id: string;
    agent_nom: string;
    kit_type: string;
    beneficiaires: any[];
    notes?: string;
  }): Promise<Protocole> {
    const exchangeRate = await this.getExchangeRate();
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);

    let total_usd = 0;
    let total_cdf = 0;

    const processedBeneficiaires = params.beneficiaires.map(b => {
      let b_usd = 0;
      let b_cdf = 0;
      const bProds = (b.produits || []).map((p: any) => {
        const dbP = prods.find(prd => prd.id === p.produit_id);
        const prx = dbP ? dbP.prix : 5;
        const dev = dbP ? dbP.devise : "USD";
        const itemTot = prx * (p.quantite || 0);

        if (dev === "USD") {
          b_usd += itemTot;
          b_cdf += itemTot * exchangeRate;
        } else {
          b_cdf += itemTot;
          b_usd += itemTot / exchangeRate;
        }

        return {
          produit_id: p.produit_id,
          produit_nom: dbP ? dbP.nom : "Article",
          quantite: p.quantite,
          prix_unitaire: prx,
          devise: dev as "USD" | "CDF"
        };
      });

      total_usd += b_usd;
      total_cdf += b_cdf;

      return {
        nom: b.nom,
        telephone: b.telephone || "Non spécifié",
        adresse: b.adresse || "Non spécifiée",
        produits: bProds,
        total_usd: parseFloat(b_usd.toFixed(2)),
        total_cdf: Math.round(b_cdf),
        date_entree: new Date().toISOString().split("T")[0]
      };
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newProt: Protocole = {
      id: "pr-" + Math.random().toString(36).substring(2, 9),
      institution: params.institution,
      quartier: params.quartier || "Ibanda",
      agent_id: params.agent_id,
      agent_nom: params.agent_nom,
      date_creation: new Date().toISOString().split("T")[0],
      date_echeance: dueDate.toISOString().split("T")[0],
      statut: "en_attente",
      statut_paiement: "non_paye",
      kit_type: (params.kit_type as any) || "standard",
      notes: params.notes || "",
      montant_du_usd: parseFloat(total_usd.toFixed(2)),
      montant_du_cdf: Math.round(total_cdf),
      montant_paye_usd: 0,
      montant_paye_cdf: 0,
      taux_change: exchangeRate,
      beneficiaires: processedBeneficiaires,
      versements: []
    };

    const protocoles = getStored<Protocole[]>(STORAGE_KEYS.PROTOCOLES, []);
    protocoles.unshift(newProt);
    setStored(STORAGE_KEYS.PROTOCOLES, protocoles);

    if (supabase) {
      try {
        await supabase.from("protocoles").insert(newProt);
      } catch (e) {
        console.warn("Supabase insert protocole error:", e);
      }
    }

    return newProt;
  },

  async updateProtocoleStatut(id: string, statut: "valide" | "rejete"): Promise<Protocole> {
    const protocoles = getStored<Protocole[]>(STORAGE_KEYS.PROTOCOLES, []);
    const idx = protocoles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Protocole introuvable");

    protocoles[idx].statut = statut;
    const prot = protocoles[idx];

    // Si validé par l'Admin, convertir immédiatement en ventes effectives et déduire le stock !
    if (statut === "valide") {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
      const agentObj = users.find(u => u.id === prot.agent_id);
      const commissionTaux = agentObj?.commission_rate ?? (agentObj?.role === "distributeur" ? 20 : 15);
      const agentStocks = getStored<AgentStock[]>(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
      const ventes = getStored<Vente[]>(STORAGE_KEYS.VENTES, SEED_VENTES);

      prot.beneficiaires.forEach(b => {
        // Déduire le stock
        if (b.produits) {
          b.produits.forEach(pItem => {
            const sIdx = agentStocks.findIndex(s => s.agent_id === prot.agent_id && s.produit_id === pItem.produit_id);
            if (sIdx !== -1) {
              agentStocks[sIdx].stock -= pItem.quantite;
            } else {
              agentStocks.push({
                id: "as-" + Math.random().toString(36).substring(2, 9),
                agent_id: prot.agent_id,
                produit_id: pItem.produit_id,
                stock: -pItem.quantite
              });
            }
          });
        }

        const commUSD = b.total_usd * (commissionTaux / 100);
        const commCDF = b.total_cdf * (commissionTaux / 100);

        const newVente: Vente = {
          id: "v-pr-" + Math.random().toString(36).substring(2, 7),
          client_id: undefined,
          client_nom: `${prot.institution} - ${b.nom}`,
          quartier: prot.quartier,
          produits: b.produits,
          total: b.total_usd,
          total_cdf: b.total_cdf,
          date_vente: new Date().toISOString().split("T")[0],
          agent_id: prot.agent_id,
          agent_nom: prot.agent_nom,
          type_paiement: "credit",
          commission_taux: commissionTaux,
          commission_montant: parseFloat(commUSD.toFixed(2)),
          commission_montant_cdf: Math.round(commCDF),
          taux_change: prot.taux_change,
          statut_paiement: "valide" // Validée d'office pour créditer la commission
        };
        ventes.unshift(newVente);
      });

      setStored(STORAGE_KEYS.AGENT_STOCKS, agentStocks);
      setStored(STORAGE_KEYS.VENTES, ventes);
    }

    setStored(STORAGE_KEYS.PROTOCOLES, protocoles);

    if (supabase) {
      try {
        await supabase.from("protocoles").update({ statut }).eq("id", id);
      } catch (e) {
        console.warn("Supabase update protocole error:", e);
      }
    }

    return prot;
  },

  async addVersement(protocoleId: string, versement: { montant: number; devise: "USD" | "CDF"; moyen_paiement: any }): Promise<Protocole> {
    const protocoles = getStored<Protocole[]>(STORAGE_KEYS.PROTOCOLES, []);
    const idx = protocoles.findIndex(p => p.id === protocoleId);
    if (idx === -1) throw new Error("Protocole introuvable");

    const prot = protocoles[idx];
    const newVst = {
      id: "vst-" + Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString().split("T")[0],
      montant: parseFloat(versement.montant as any),
      devise: versement.devise,
      moyen_paiement: versement.moyen_paiement
    };
    prot.versements.push(newVst);

    // Recalcul des montants payés
    let paidUSD = 0;
    let paidCDF = 0;
    prot.versements.forEach(v => {
      if (v.devise === "USD") {
        paidUSD += v.montant;
        paidCDF += v.montant * prot.taux_change;
      } else {
        paidCDF += v.montant;
        paidUSD += v.montant / prot.taux_change;
      }
    });

    prot.montant_paye_usd = parseFloat(paidUSD.toFixed(2));
    prot.montant_paye_cdf = Math.round(paidCDF);

    const tolerance = 0.05;
    if (prot.montant_paye_usd >= prot.montant_du_usd - tolerance) {
      prot.statut_paiement = "total";
    } else if (prot.montant_paye_usd > 0) {
      prot.statut_paiement = "partiel";
    } else {
      prot.statut_paiement = "non_paye";
    }

    setStored(STORAGE_KEYS.PROTOCOLES, protocoles);

    if (supabase) {
      try {
        await supabase.from("protocoles").update({
          versements: prot.versements,
          montant_paye_usd: prot.montant_paye_usd,
          montant_paye_cdf: prot.montant_paye_cdf,
          statut_paiement: prot.statut_paiement
        }).eq("id", protocoleId);
      } catch (e) {
        console.warn("Supabase addVersement error:", e);
      }
    }

    return prot;
  },

  async addBeneficiaire(protocoleId: string, beneficiaire: {
    nom: string;
    telephone?: string;
    adresse?: string;
    produits: Array<{ produit_id: string; quantite: number }>;
    date_entree?: string;
  }): Promise<Protocole> {
    const protocoles = getStored<Protocole[]>(STORAGE_KEYS.PROTOCOLES, []);
    const idx = protocoles.findIndex(p => p.id === protocoleId);
    if (idx === -1) throw new Error("Protocole introuvable");

    const prot = protocoles[idx];
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);

    let b_usd = 0;
    let b_cdf = 0;
    const bProds = beneficiaire.produits.map(p => {
      const dbP = prods.find(prd => prd.id === p.produit_id);
      const prx = dbP ? dbP.prix : 5;
      const dev = dbP ? dbP.devise : "USD";
      const itemTot = prx * (p.quantite || 0);

      if (dev === "USD") {
        b_usd += itemTot;
        b_cdf += itemTot * prot.taux_change;
      } else {
        b_cdf += itemTot;
        b_usd += itemTot / prot.taux_change;
      }

      return {
        produit_id: p.produit_id,
        produit_nom: dbP ? dbP.nom : "Article",
        quantite: p.quantite,
        prix_unitaire: prx,
        devise: dev as "USD" | "CDF"
      };
    });

    const newB = {
      nom: beneficiaire.nom,
      telephone: beneficiaire.telephone || "Non spécifié",
      adresse: beneficiaire.adresse || "Non spécifiée",
      produits: bProds,
      total_usd: parseFloat(b_usd.toFixed(2)),
      total_cdf: Math.round(b_cdf),
      date_entree: beneficiaire.date_entree || new Date().toISOString().split("T")[0]
    };

    prot.beneficiaires.push(newB);

    let totUSD = 0;
    let totCDF = 0;
    prot.beneficiaires.forEach(b => {
      totUSD += b.total_usd;
      totCDF += b.total_cdf;
    });
    prot.montant_du_usd = parseFloat(totUSD.toFixed(2));
    prot.montant_du_cdf = Math.round(totCDF);

    // Si protocole déjà validé, déduire le stock et créditer la commission immédiatement
    if (prot.statut === "valide") {
      const agentStocks = getStored<AgentStock[]>(STORAGE_KEYS.AGENT_STOCKS, SEED_AGENT_STOCKS);
      bProds.forEach(item => {
        const sIdx = agentStocks.findIndex(s => s.agent_id === prot.agent_id && s.produit_id === item.produit_id);
        if (sIdx !== -1) {
          agentStocks[sIdx].stock -= item.quantite;
        }
      });
      setStored(STORAGE_KEYS.AGENT_STOCKS, agentStocks);

      const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
      const agentObj = users.find(u => u.id === prot.agent_id);
      const commTaux = agentObj?.commission_rate ?? (agentObj?.role === "distributeur" ? 20 : 15);
      const commUSD = b_usd * (commTaux / 100);
      const commCDF = b_cdf * (commTaux / 100);

      const newVente: Vente = {
        id: "v-pr-add-" + Math.random().toString(36).substring(2, 7),
        client_id: undefined,
        client_nom: `${prot.institution} - ${beneficiaire.nom}`,
        quartier: prot.quartier,
        produits: bProds,
        total: parseFloat(b_usd.toFixed(2)),
        total_cdf: Math.round(b_cdf),
        date_vente: new Date().toISOString().split("T")[0],
        agent_id: prot.agent_id,
        agent_nom: prot.agent_nom,
        type_paiement: "credit",
        commission_taux: commTaux,
        commission_montant: parseFloat(commUSD.toFixed(2)),
        commission_montant_cdf: Math.round(commCDF),
        taux_change: prot.taux_change,
        statut_paiement: "valide"
      };

      const ventes = getStored<Vente[]>(STORAGE_KEYS.VENTES, SEED_VENTES);
      ventes.unshift(newVente);
      setStored(STORAGE_KEYS.VENTES, ventes);
    }

    setStored(STORAGE_KEYS.PROTOCOLES, protocoles);

    if (supabase) {
      try {
        await supabase.from("protocoles").update({
          beneficiaires: prot.beneficiaires,
          montant_du_usd: prot.montant_du_usd,
          montant_du_cdf: prot.montant_du_cdf
        }).eq("id", protocoleId);
      } catch (e) {
        console.warn("Supabase addBeneficiaire error:", e);
      }
    }

    return prot;
  },

  // --------------------------------------------------------------------------
  // SALAIRES FIXES ($40 VENDEUR, $0 DISTRIB) & FICHES DE PAIE
  // --------------------------------------------------------------------------
  async getFactures(agentId?: string): Promise<FactureAgent[]> {
    if (supabase) {
      try {
        let query = supabase.from("paiements_factures").select("*");
        if (agentId) query = query.eq("agent_id", agentId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          if (!agentId) setStored(STORAGE_KEYS.FACTURES, data);
          return data;
        }
      } catch (e) {
        console.warn("Supabase getFactures fallback:", e);
      }
    }
    const all = getStored<FactureAgent[]>(STORAGE_KEYS.FACTURES, []);
    if (agentId) return all.filter(f => f.agent_id === agentId);
    return all;
  },

  async createFacture(body: {
    agent_id: string;
    agent_nom: string;
    mois: string;
    ventes_count: number;
    total_commission_usd: number;
    total_commission_cdf: number;
    salaire_fixe?: number;
  }): Promise<FactureAgent> {
    // Calcul automatique du salaire fixe : 40$ pour vendeur, 0$ pour distributeur
    const users = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const agentObj = users.find(u => u.id === body.agent_id);
    const salaireFixe = body.salaire_fixe !== undefined
      ? body.salaire_fixe
      : (agentObj?.role === "vendeur" ? 40.0 : 0.0);

    const newF: FactureAgent = {
      id: "f-" + Math.random().toString(36).substring(2, 9),
      agent_id: body.agent_id,
      agent_nom: body.agent_nom,
      mois: body.mois || "Mois en cours",
      date_creation: new Date().toISOString().split("T")[0],
      ventes_count: parseInt(body.ventes_count as any) || 0,
      total_commission_usd: parseFloat(body.total_commission_usd as any) || 0,
      total_commission_cdf: parseInt(body.total_commission_cdf as any) || 0,
      salaire_fixe: salaireFixe,
      statut: "en_attente"
    };

    const factures = getStored<FactureAgent[]>(STORAGE_KEYS.FACTURES, []);
    factures.unshift(newF);
    setStored(STORAGE_KEYS.FACTURES, factures);

    if (supabase) {
      try {
        await supabase.from("paiements_factures").insert(newF);
      } catch (e) {
        console.warn("Supabase insert facture error:", e);
      }
    }

    return newF;
  },

  async validerFacture(id: string): Promise<FactureAgent> {
    const factures = getStored<FactureAgent[]>(STORAGE_KEYS.FACTURES, []);
    const idx = factures.findIndex(f => f.id === id);
    if (idx === -1) throw new Error("Fiche de paie introuvable");

    factures[idx].statut = "paye";
    factures[idx].date_paiement = new Date().toISOString().split("T")[0];
    setStored(STORAGE_KEYS.FACTURES, factures);

    if (supabase) {
      try {
        await supabase.from("paiements_factures").update({
          statut: "paye",
          date_paiement: factures[idx].date_paiement
        }).eq("id", id);
      } catch (e) {
        console.warn("Supabase validerFacture error:", e);
      }
    }

    return factures[idx];
  },

  // --------------------------------------------------------------------------
  // ARRIVAGES DE STOCK & AUDIT LOGS
  // --------------------------------------------------------------------------
  async getStockArrivalsAndLogs(): Promise<{ arrivals: StockArrival[]; auditLogs: AuditLog[] }> {
    const arrivals = getStored<StockArrival[]>(STORAGE_KEYS.STOCK_ARRIVALS, []);
    const auditLogs = getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return { arrivals, auditLogs };
  },

  async createStockArrival(produitId: string, quantite: number, auteurNom: string): Promise<StockArrival> {
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const prod = prods.find(p => p.id === produitId);
    if (!prod) throw new Error("Produit introuvable");

    const parsedQty = parseInt(quantite as any);
    const newArr: StockArrival = {
      id: "sa-" + Math.random().toString(36).substring(2, 9),
      produit_id: produitId,
      produit_nom: prod.nom,
      quantite: parsedQty,
      date_enregistrement: new Date().toISOString().split("T")[0],
      auteur_nom: auteurNom || "Stock & Caisse"
    };

    // Ajuster le stock central
    prod.stock = (prod.stock || 0) + parsedQty;
    setStored(STORAGE_KEYS.PRODUITS, prods);

    const arrivals = getStored<StockArrival[]>(STORAGE_KEYS.STOCK_ARRIVALS, []);
    arrivals.unshift(newArr);
    setStored(STORAGE_KEYS.STOCK_ARRIVALS, arrivals);

    // Audit log
    await this.addAuditLog({
      action: "Réception de stock",
      details: `Réception de ${parsedQty} PCS de ${prod.nom} au dépôt central par ${auteurNom}.`,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      auteur: auteurNom
    });

    if (supabase) {
      try {
        await supabase.from("stock_arrivals").insert(newArr);
        await supabase.from("produits").update({ stock: prod.stock }).eq("id", produitId);
      } catch (e) {
        console.warn("Supabase createStockArrival error:", e);
      }
    }

    return newArr;
  },

  async updateStockArrival(id: string, newQty: number, auteurNom: string): Promise<StockArrival> {
    const arrivals = getStored<StockArrival[]>(STORAGE_KEYS.STOCK_ARRIVALS, []);
    const idx = arrivals.findIndex(a => a.id === id);
    if (idx === -1) throw new Error("Arrivage introuvable");

    const arrival = arrivals[idx];
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const prod = prods.find(p => p.id === arrival.produit_id);
    if (!prod) throw new Error("Produit introuvable");

    const oldQty = arrival.quantite;
    const diff = newQty - oldQty;
    arrival.quantite = newQty;
    prod.stock = Math.max(0, (prod.stock || 0) + diff);

    setStored(STORAGE_KEYS.STOCK_ARRIVALS, arrivals);
    setStored(STORAGE_KEYS.PRODUITS, prods);

    await this.addAuditLog({
      action: "Modification d'entrée de stock",
      details: `L'utilisateur ${auteurNom} a modifié l'entrée de ${prod.nom} de ${oldQty} à ${newQty} PCS.`,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      auteur: auteurNom
    });

    return arrival;
  },

  async deleteStockArrival(id: string, auteurNom: string): Promise<void> {
    const arrivals = getStored<StockArrival[]>(STORAGE_KEYS.STOCK_ARRIVALS, []);
    const idx = arrivals.findIndex(a => a.id === id);
    if (idx === -1) throw new Error("Arrivage introuvable");

    const arrival = arrivals[idx];
    const prods = getStored<Produit[]>(STORAGE_KEYS.PRODUITS, SEED_PRODUITS);
    const prod = prods.find(p => p.id === arrival.produit_id);
    if (prod) {
      prod.stock = Math.max(0, (prod.stock || 0) - arrival.quantite);
      setStored(STORAGE_KEYS.PRODUITS, prods);
    }

    arrivals.splice(idx, 1);
    setStored(STORAGE_KEYS.STOCK_ARRIVALS, arrivals);

    await this.addAuditLog({
      action: "Suppression d'entrée de stock",
      details: `L'utilisateur ${auteurNom} a supprimé l'entrée de ${prod ? prod.nom : "Article"} d'une quantité de ${arrival.quantite} PCS.`,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      auteur: auteurNom
    });
  },

  async addAuditLog(log: Omit<AuditLog, "id">): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      ...log
    };
    const logs = getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    logs.unshift(newLog);
    setStored(STORAGE_KEYS.AUDIT_LOGS, logs);

    if (supabase) {
      try {
        await supabase.from("audit_logs").insert(newLog);
      } catch (e) {
        console.warn("Supabase insert audit log error:", e);
      }
    }

    return newLog;
  },

  // --------------------------------------------------------------------------
  // MESSAGERIE INTERNE (NOTIFICATIONS ADMIN -> AGENTS)
  // --------------------------------------------------------------------------
  async getNotifications(role?: string, userId?: string): Promise<AppNotification[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setStored(STORAGE_KEYS.NOTIFICATIONS, data);
          return data.filter(n => {
            if (!role && !userId) return true;
            if (n.destinataire_role === "all") return true;
            if (role && n.destinataire_role === role) return true;
            if (userId && n.destinataire_id === userId) return true;
            return false;
          });
        }
      } catch (e) {
        console.warn("Supabase getNotifications fallback:", e);
      }
    }

    const all = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    return all.filter(n => {
      if (!role && !userId) return true;
      if (n.destinataire_role === "all") return true;
      if (role && n.destinataire_role === role) return true;
      if (userId && n.destinataire_id === userId) return true;
      return false;
    });
  },

  async sendNotification(params: {
    titre: string;
    message: string;
    destinataire_role?: string;
    destinataire_id?: string;
    auteur_nom: string;
    type?: "info" | "alerte" | "stock" | "reassort" | "validation";
  }): Promise<AppNotification> {
    const newN: AppNotification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      titre: params.titre,
      message: params.message,
      destinataire_role: params.destinataire_role || "all",
      destinataire_id: params.destinataire_id,
      auteur_nom: params.auteur_nom,
      lu: false,
      created_at: new Date().toISOString(),
      type: params.type || "info"
    };

    const notifs = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    notifs.unshift(newN);
    setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);

    if (supabase) {
      try {
        await supabase.from("notifications").insert(newN);
      } catch (e) {
        console.warn("Supabase insert notification error:", e);
      }
    }

    return newN;
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const notifs = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.lu = true;
      setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }

    if (supabase) {
      try {
        await supabase.from("notifications").update({ lu: true }).eq("id", id);
      } catch (e) {
        console.warn("Supabase markNotificationAsRead error:", e);
      }
    }
  },

  // --------------------------------------------------------------------------
  // PARAMÈTRES GLOBAUX & TAUX DE CHANGE (ADMIN)
  // --------------------------------------------------------------------------
  async getExchangeRate(): Promise<number> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "exchange_rate")
          .single();

        if (!error && data && data.value) {
          const rate = parseFloat(data.value);
          setStored(STORAGE_KEYS.EXCHANGE_RATE, rate);
          return rate;
        }
      } catch (e) {
        console.warn("Supabase getExchangeRate fallback:", e);
      }
    }
    return getStored<number>(STORAGE_KEYS.EXCHANGE_RATE, 2850);
  },

  async setExchangeRate(newRate: number): Promise<number> {
    if (isNaN(newRate) || newRate <= 0) throw new Error("Taux de change invalide");

    setStored(STORAGE_KEYS.EXCHANGE_RATE, newRate);

    if (supabase) {
      try {
        await supabase.from("settings").upsert({
          key: "exchange_rate",
          value: newRate.toString()
        });
      } catch (e) {
        console.warn("Supabase setExchangeRate error:", e);
      }
    }

    return newRate;
  },

  // --------------------------------------------------------------------------
  // CALCUL DES STATISTIQUES FINANCIÈRES & CONSOLIDATION
  // --------------------------------------------------------------------------
  async calculateStats(agentId?: string): Promise<Stats> {
    const exchangeRate = await this.getExchangeRate();
    let allVentes = getStored<Vente[]>(STORAGE_KEYS.VENTES, SEED_VENTES);
    let allProtocoles = getStored<Protocole[]>(STORAGE_KEYS.PROTOCOLES, []);
    const allClients = getStored<Client[]>(STORAGE_KEYS.CLIENTS, SEED_CLIENTS);

    if (agentId) {
      allVentes = allVentes.filter(v => v.agent_id === agentId);
      allProtocoles = allProtocoles.filter(p => p.agent_id === agentId);
    }

    let totalCash = allVentes
      .filter(v => v.type_paiement === "cash" && v.statut_paiement === "valide")
      .reduce((acc, v) => acc + v.total, 0);

    const totalCredit = allVentes
      .filter(v => v.type_paiement === "credit")
      .reduce((acc, v) => acc + v.total, 0);

    let totalMobile = allVentes
      .filter(v => ["mpesa", "airtel_money", "orange_money"].includes(v.type_paiement) && v.statut_paiement === "valide")
      .reduce((acc, v) => acc + v.total, 0);

    // Intégrer les versements d'acomptes des protocoles validés
    allProtocoles.forEach(p => {
      p.versements.forEach(v => {
        const amtUSD = v.devise === "USD" ? v.montant : v.montant / (p.taux_change || exchangeRate);
        if (v.moyen_paiement === "cash") {
          totalCash += amtUSD;
        } else if (["mpesa", "airtel_money", "orange_money"].includes(v.moyen_paiement)) {
          totalMobile += amtUSD;
        }
      });
    });

    const chiffreAffaires = totalCash + totalCredit + totalMobile;
    const totalCommissions = allVentes.reduce((acc, v) => acc + (v.commission_montant || 0), 0);

    // Alerte J-5 protocoles
    const todayStr = new Date().toISOString().split("T")[0];
    const alertesActives = allProtocoles.filter(p => {
      if (p.statut_paiement === "total") return false;
      if (!p.date_echeance) return false;
      const due = new Date(p.date_echeance);
      const curr = new Date(todayStr);
      due.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - curr.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 5;
    }).length;

    // Statistiques par quartier de Bukavu
    const statsQuartiers = ["Panzi", "Kadutu", "Ibanda"].map(q => {
      const vQ = allVentes.filter(v => v.quartier && v.quartier.toLowerCase() === q.toLowerCase());
      const caQ = vQ.reduce((acc, v) => acc + v.total, 0);
      const cQ = allClients.filter(c => c.quartier && c.quartier.toLowerCase() === q.toLowerCase()).length;
      return {
        quartier: q,
        ca: parseFloat(caQ.toFixed(2)),
        ventes_nombre: vQ.length,
        clients_nombre: cQ
      };
    });

    const reassorts = getStored<ReassortRequest[]>(STORAGE_KEYS.REASSORTS, []);

    return {
      chiffre_affaires: parseFloat(chiffreAffaires.toFixed(2)),
      total_ventes_cash: parseFloat(totalCash.toFixed(2)),
      total_ventes_credit: parseFloat(totalCredit.toFixed(2)),
      total_ventes_mobile: parseFloat(totalMobile.toFixed(2)),
      total_commissions: parseFloat(totalCommissions.toFixed(2)),
      nombre_ventes: allVentes.length,
      nombre_clients: allClients.length,
      nombre_promesses: reassorts.filter(r => r.statut === "en_attente").length,
      nombre_alertes: alertesActives,
      stats_quartiers: statsQuartiers
    };
  }
};
