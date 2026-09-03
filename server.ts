import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import { ReassortRequest, FactureAgent, User, Produit, AgentStock, Client, Vente, Protocole } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Hybrid resolution for production path
const distPath = path.join(process.cwd(), "dist");

// Initialize Supabase if available
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

let supabase: any = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== "MY_SUPABASE_URL" && supabaseUrl !== "YOUR_SUPABASE_URL") {
  try {
    if (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://")) {
      supabase = createClient(supabaseUrl, supabaseAnonKey);
      if (supabase) {
        isSupabaseConfigured = true;
        console.log("🟢 Connexion initiale à Supabase configurée.");
      }
    } else {
      console.warn("⚠️ URL Supabase malformée.");
    }
  } catch (error) {
    console.error("🔴 Erreur Supabase:", error);
  }
}

if (!isSupabaseConfigured) {
  console.log("🟡 Mode Démo local actif.");
}

// ----------------------------------------------------
// LOCAL IN-MEMORY DATABASE (DEMO/FALLBACK)
// ----------------------------------------------------
let exchangeRate = 2850;

let localUsers: User[] = [
  { id: "u-admin", email: "admin@stoppaludisme.cd", name: "Justin Ciza (Admin)", role: "admin", commission_rate: 0, statut: "valide", telephone: "+243 904 259 671" },
  { id: "u-vendeur", email: "vendeur@stoppaludisme.cd", name: "Bahati Murhula (Vendeur)", role: "vendeur", commission_rate: 15, statut: "valide", telephone: "+243 999 073 461" },
  { id: "u-distrib", email: "distributeur@stoppaludisme.cd", name: "Kavira Masika (Distributeur)", role: "distributeur", commission_rate: 20, statut: "valide", telephone: "+243 998 123 456" },
  { id: "u-stock", email: "stock@stoppaludisme.cd", name: "Leopold Mushamuka (Stock & Caisse)", role: "stock_caissier", commission_rate: 0, statut: "valide", telephone: "+243 812 345 678" },
  { id: "u-caissier", email: "caissier@stoppaludisme.cd", name: "Florence Nabintu (Stock & Caisse)", role: "stock_caissier", commission_rate: 0, statut: "valide", telephone: "+243 976 543 210" },
  { id: "u-pending-1", email: "gloire.baraka@gmail.com", name: "Gloire Baraka", role: "vendeur", commission_rate: 15, statut: "en_attente", telephone: "+243 991 223 344", created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: "u-pending-2", email: "pascaline.nabami@gmail.com", name: "Pascaline Nabami", role: "distributeur", commission_rate: 20, statut: "en_attente", telephone: "+243 823 445 566", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
];

// Map password store for mock users
const localPasswords: Record<string, string> = {
  "admin@stoppaludisme.cd": "admin",
  "vendeur@stoppaludisme.cd": "vendeur",
  "distributeur@stoppaludisme.cd": "distributeur",
  "stock@stoppaludisme.cd": "stock",
  "caissier@stoppaludisme.cd": "caissier",
  "gloire.baraka@gmail.com": "password123",
  "pascaline.nabami@gmail.com": "password123"
};

let localProduits: Produit[] = [
  { id: "me_std", nom: "M-E STANDARD", type: "moustiquaire", prix: 5.0, devise: "USD", description: "Moustiquaire Électrique Standard", stock: 120 },
  { id: "me_prem", nom: "M-E PREMIUM", type: "moustiquaire", prix: 10.0, devise: "USD", description: "Moustiquaire Électrique Premium", stock: 80 },
  { id: "me_pro", nom: "M-E PRO", type: "moustiquaire", prix: 20.0, devise: "USD", description: "Moustiquaire Électrique Pro Professionnelle", stock: 50 },
  { id: "me_usb", nom: "M-E USB", type: "moustiquaire", prix: 12.0, devise: "USD", description: "Moustiquaire Électrique USB rechargeable", stock: 65 },
  { id: "c_liq", nom: "LIQUIDE RECHARGE", type: "consommable", prix: 3000.0, devise: "CDF", description: "Recharge Liquide longue durée", stock: 250 },
  { id: "c_plq", nom: "PLAQUETTE INSECTICIDE", type: "consommable", prix: 5000.0, devise: "CDF", description: "Plaquette insecticide de rechange", stock: 300 }
];

let localAgentStocks: AgentStock[] = [
  { id: "as1", agent_id: "u-vendeur", produit_id: "me_std", stock: 15 },
  { id: "as2", agent_id: "u-vendeur", produit_id: "me_prem", stock: 10 },
  { id: "as3", agent_id: "u-vendeur", produit_id: "c_liq", stock: 30 },
  { id: "as4", agent_id: "u-distrib", produit_id: "me_std", stock: 20 },
  { id: "as5", agent_id: "u-distrib", produit_id: "me_prem", stock: 15 },
  { id: "as6", agent_id: "u-distrib", produit_id: "c_liq", stock: 40 }
];

let localReassorts: ReassortRequest[] = [
  {
    id: "re-1",
    agent_id: "u-vendeur",
    agent_nom: "Bahati Murhula (Vendeur)",
    produit_id: "me_std",
    produit_nom: "M-E STANDARD",
    quantite: 15,
    statut: "en_attente",
    date_creation: new Date().toISOString().split("T")[0]
  }
];

let localClients: Client[] = [
  { id: "c1", nom: "Marie Mugoli", telephone: "+243 998 123 456", quartier: "Panzi", adresse: "Av. de la Paix, No 24" },
  { id: "c2", nom: "Jean-Bosco Mushamuka", telephone: "+243 812 345 678", quartier: "Kadutu", adresse: "Av. Kasongo, No 115" },
  { id: "c3", nom: "Florence Nabintu", telephone: "+243 976 543 210", quartier: "Ibanda", adresse: "Av. Patrice Lumumba, No 89" }
];

let localVentes: Vente[] = [
  {
    id: "v1",
    client_id: "c1",
    client_nom: "Marie Mugoli",
    quartier: "Panzi",
    produits: [
      { produit_id: "me_std", produit_nom: "M-E STANDARD", quantite: 2, prix_unitaire: 5.0, devise: "USD" }
    ],
    total: 10.0,
    total_cdf: 28500,
    date_vente: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    agent_id: "u-vendeur",
    agent_nom: "Bahati Murhula (Vendeur)",
    type_paiement: "credit",
    commission_taux: 15,
    commission_montant: 1.5,
    commission_montant_cdf: 4275,
    taux_change: 2850,
    statut_paiement: "en_attente"
  },
  {
    id: "v2",
    client_id: "c2",
    client_nom: "Jean-Bosco Mushamuka",
    quartier: "Kadutu",
    produits: [
      { produit_id: "me_prem", produit_nom: "M-E PREMIUM", quantite: 1, prix_unitaire: 10.0, devise: "USD" }
    ],
    total: 10.0,
    total_cdf: 28500,
    date_vente: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    agent_id: "u-vendeur",
    agent_nom: "Bahati Murhula (Vendeur)",
    type_paiement: "cash",
    commission_taux: 15,
    commission_montant: 1.5,
    commission_montant_cdf: 4275,
    taux_change: 2850,
    statut_paiement: "valide"
  }
];

let localProtocoles: Protocole[] = [
  {
    id: "pr1",
    institution: "Hôpital de Référence de Panzi",
    quartier: "Panzi",
    agent_id: "u-vendeur",
    agent_nom: "Bahati Murhula (Vendeur)",
    date_creation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    date_echeance: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Exactement dans 5 jours pour déclencher la notification !
    statut: "en_attente",
    statut_paiement: "non_paye",
    kit_type: "standard",
    notes: "Protocole clinique pour le pavillon pédiatrique.",
    montant_du_usd: 50.0,
    montant_du_cdf: 142500,
    montant_paye_usd: 0,
    montant_paye_cdf: 0,
    taux_change: 2850,
    beneficiaires: [
      {
        nom: "Dr. Jean-Pierre Baleke",
        telephone: "+243 994 556 112",
        adresse: "Avenue Hôpital de Panzi, Panzi, Ibanda, Bukavu",
        produits: [{ produit_id: "me_std", produit_nom: "M-E STANDARD", quantite: 10, prix_unitaire: 5.0, devise: "USD" }],
        total_usd: 50.0,
        total_cdf: 142500
      }
    ],
    versements: []
  }
];

let localFactures: FactureAgent[] = [
  {
    id: "f1",
    agent_id: "u-vendeur",
    agent_nom: "Bahati Murhula (Vendeur)",
    mois: "Août 2026",
    date_creation: new Date().toISOString().split("T")[0],
    ventes_count: 2,
    total_commission_usd: 3.0,
    total_commission_cdf: 8550,
    salaire_fixe: 40.0,
    statut: "en_attente"
  }
];

// --- ARRIvAGES ET JOURNAL D'AUDIT DU STOCK CENTRAL ---
let localStockArrivals: any[] = [
  { id: "sa1", produit_id: "me_std", produit_nom: "M-E STANDARD", quantite: 120, date_enregistrement: "2026-08-20", auteur_nom: "Justin Ciza (Stock & Caisse)" },
  { id: "sa2", produit_id: "me_prem", produit_nom: "M-E PREMIUM", quantite: 80, date_enregistrement: "2026-08-21", auteur_nom: "Justin Ciza (Stock & Caisse)" },
  { id: "sa3", produit_id: "me_pro", produit_nom: "M-E PRO", quantite: 50, date_enregistrement: "2026-08-22", auteur_nom: "Justin Ciza (Stock & Caisse)" },
  { id: "sa4", produit_id: "me_usb", produit_nom: "M-E USB", quantite: 65, date_enregistrement: "2026-08-22", auteur_nom: "Justin Ciza (Stock & Caisse)" },
  { id: "sa5", produit_id: "c_liq", produit_nom: "LIQUIDE RECHARGE", quantite: 250, date_enregistrement: "2026-08-23", auteur_nom: "Justin Ciza (Stock & Caisse)" },
  { id: "sa6", produit_id: "c_plq", produit_nom: "PLAQUETTE INSECTICIDE", quantite: 300, date_enregistrement: "2026-08-23", auteur_nom: "Justin Ciza (Stock & Caisse)" }
];

let localAuditLogs: any[] = [
  { id: "log1", action: "Initialisation", details: "Initialisation des stocks de démarrage au dépôt central.", date: "2026-08-23 08:00", auteur: "Justin Ciza (Admin)" }
];

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

app.get("/api/db-status", (req, res) => {
  res.json({
    supabaseConfigured: isSupabaseConfigured,
    mode: isSupabaseConfigured ? "Production (Supabase)" : "Démo / Stockage local",
    details: isSupabaseConfigured ? "Connecté au cloud Supabase" : "Données simulées en mémoire de haute fidélité"
  });
});

// Exchange rate
app.get("/api/exchange-rate", (req, res) => {
  res.json({ exchangeRate });
});

app.post("/api/exchange-rate", (req, res) => {
  const { rate } = req.body;
  if (!rate || isNaN(rate)) {
    return res.status(400).json({ error: "Taux de change invalide." });
  }
  exchangeRate = parseInt(rate);
  res.json({ success: true, exchangeRate });
});

// Authentification
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email ou identifiant et mot de passe requis." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = localUsers.find(u => u.email.toLowerCase() === cleanEmail || (u.telephone && u.telephone.replace(/[^0-9]/g, "") === cleanEmail.replace(/[^0-9]/g, "")));
  if (!user) {
    return res.status(401).json({ error: "Identifiants incorrects ou utilisateur inexistant." });
  }

  const savedPassword = localPasswords[user.email.toLowerCase()];
  if (savedPassword !== password) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  // Vérification du statut de validation admin
  if (user.statut === "en_attente") {
    return res.status(403).json({ error: "Votre compte est en attente de validation par l'administrateur. Veuillez patienter ou contacter la direction." });
  }
  if (user.statut === "rejete") {
    return res.status(403).json({ error: "Votre demande d'accès a été rejetée par l'administrateur." });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      telephone: user.telephone,
      statut: user.statut || "valide",
      commission_rate: user.commission_rate
    }
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, telephone, password } = req.body;
  if (!name || (!email && !telephone) || !password) {
    return res.status(400).json({ error: "Nom, identifiant (email ou téléphone) et mot de passe requis." });
  }

  const cleanEmail = email ? email.trim().toLowerCase() : `${(telephone || "").replace(/[^0-9]/g, "")}@stoppaludisme.cd`;
  if (localUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: "Un compte existe déjà avec ces coordonnées." });
  }

  const newUser: User = {
    id: "u-" + Math.random().toString(36).substr(2, 9),
    email: cleanEmail,
    name,
    role: "vendeur",
    commission_rate: 15,
    telephone: telephone || "",
    statut: "en_attente",
    created_at: new Date().toISOString()
  };

  localUsers.push(newUser);
  localPasswords[cleanEmail] = password;

  if (supabase) {
    supabase.from("profiles").upsert({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      telephone: newUser.telephone,
      role: newUser.role,
      statut: "en_attente",
      created_at: newUser.created_at
    }).then(() => {}).catch((err: any) => console.warn("Supabase upsert profile warning:", err));
  }

  res.status(201).json({
    success: true,
    message: "Votre demande d'inscription a été enregistrée avec succès. Elle est actuellement en attente de validation par l'administrateur.",
    user: newUser
  });
});

// Users
app.get("/api/users", (req, res) => {
  res.json(localUsers);
});

app.post("/api/users", (req, res) => {
  const { email, password, name, role, commission_rate, telephone } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  const newUser: User = {
    id: "u-" + Math.random().toString(36).substr(2, 9),
    email,
    name,
    role,
    telephone: telephone || "",
    statut: "valide",
    commission_rate: commission_rate !== undefined ? parseFloat(commission_rate) : (role === "distributeur" ? 20 : role === "vendeur" ? 15 : 0),
    created_at: new Date().toISOString()
  };
  localUsers.push(newUser);
  localPasswords[email.toLowerCase()] = password;
  res.status(201).json(newUser);
});

app.post("/api/users/:id/validate", (req, res) => {
  const { id } = req.params;
  const { role, commission_rate } = req.body;
  const user = localUsers.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Utilisateur introuvable." });
  }

  user.statut = "valide";
  if (role) user.role = role;
  if (commission_rate !== undefined && !isNaN(parseFloat(commission_rate))) {
    user.commission_rate = parseFloat(commission_rate);
  } else if (role === "distributeur") {
    user.commission_rate = 20;
  } else if (role === "vendeur") {
    user.commission_rate = 15;
  } else {
    user.commission_rate = 0;
  }

  if (supabase) {
    supabase.from("profiles").update({
      statut: "valide",
      role: user.role,
      commission_rate: user.commission_rate
    }).eq("id", id).then(() => {}).catch((err: any) => console.warn("Supabase update error:", err));
  }

  res.json({ success: true, user });
});

app.post("/api/users/:id/reject", (req, res) => {
  const { id } = req.params;
  const user = localUsers.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Utilisateur introuvable." });
  }

  user.statut = "rejete";

  if (supabase) {
    supabase.from("profiles").update({
      statut: "rejete"
    }).eq("id", id).then(() => {}).catch((err: any) => console.warn("Supabase update error:", err));
  }

  res.json({ success: true, user });
});

app.patch("/api/users/:id/commission", (req, res) => {
  const { id } = req.params;
  const { commission_rate } = req.body;
  if (commission_rate === undefined || isNaN(commission_rate)) {
    return res.status(400).json({ error: "Taux de commission invalide." });
  }

  const idx = localUsers.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Utilisateur introuvable." });
  }

  localUsers[idx].commission_rate = parseFloat(commission_rate);
  res.json({ success: true, user: localUsers[idx] });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const user = localUsers.find(u => u.id === id);
  if (user) {
    delete localPasswords[user.email.toLowerCase()];
  }
  localUsers = localUsers.filter(u => u.id !== id);
  res.json({ success: true });
});

// Products
app.get("/api/produits", (req, res) => {
  res.json(localProduits);
});

app.post("/api/produits", (req, res) => {
  const { nom, type, prix, devise, description, stock } = req.body;
  if (!nom || !type || prix === undefined) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  const newProd: Produit = {
    id: "prod-" + Math.random().toString(36).substr(2, 9),
    nom,
    type,
    prix: parseFloat(prix),
    devise: devise || "USD",
    description: description || "",
    stock: parseInt(stock) || 0
  };
  localProduits.push(newProd);
  res.status(201).json(newProd);
});

app.put("/api/produits/:id", (req, res) => {
  const { id } = req.params;
  const { nom, type, prix, devise, description, stock } = req.body;
  const idx = localProduits.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Produit introuvable." });
  }

  localProduits[idx] = {
    ...localProduits[idx],
    nom: nom || localProduits[idx].nom,
    type: type || localProduits[idx].type,
    prix: prix !== undefined ? parseFloat(prix) : localProduits[idx].prix,
    devise: (devise as "USD" | "CDF") || localProduits[idx].devise,
    description: description || localProduits[idx].description,
    stock: stock !== undefined ? parseInt(stock) : localProduits[idx].stock
  };
  res.json(localProduits[idx]);
});

app.delete("/api/produits/:id", (req, res) => {
  const { id } = req.params;
  localProduits = localProduits.filter(p => p.id !== id);
  res.json({ success: true });
});

// --- STOCK ARRIVALS & AUDIT LOGS ENDPOINTS ---
app.get("/api/stock-arrivals", (req, res) => {
  res.json({
    arrivals: localStockArrivals,
    auditLogs: localAuditLogs
  });
});

app.post("/api/stock-arrivals", (req, res) => {
  const { produit_id, quantite, auteur_nom } = req.body;
  if (!produit_id || !quantite) {
    return res.status(400).json({ error: "Produit et quantité requis." });
  }

  const prod = localProduits.find(p => p.id === produit_id);
  if (!prod) {
    return res.status(404).json({ error: "Produit introuvable." });
  }

  const parsedQty = parseInt(quantite);
  const newArrival = {
    id: "sa-" + Math.random().toString(36).substr(2, 9),
    produit_id,
    produit_nom: prod.nom,
    quantite: parsedQty,
    date_enregistrement: new Date().toISOString().split("T")[0],
    auteur_nom: auteur_nom || "Stock & Caisse"
  };

  localStockArrivals.push(newArrival);
  prod.stock = (prod.stock || 0) + parsedQty;

  // Log in audit log
  localAuditLogs.unshift({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    action: "Réception de stock",
    details: `Réception de ${parsedQty} PCS de ${prod.nom} au dépôt central par ${auteur_nom || "Stock & Caisse"}.`,
    date: new Date().toISOString().replace("T", " ").substr(0, 16),
    auteur: auteur_nom || "Stock & Caisse"
  });

  res.status(201).json({ success: true, arrival: newArrival });
});

app.put("/api/stock-arrivals/:id", (req, res) => {
  const { id } = req.params;
  const { quantite, auteur_nom } = req.body;

  const arrIdx = localStockArrivals.findIndex(a => a.id === id);
  if (arrIdx === -1) {
    return res.status(404).json({ error: "Arrivage introuvable." });
  }

  const arrival = localStockArrivals[arrIdx];
  const prod = localProduits.find(p => p.id === arrival.produit_id);
  if (!prod) {
    return res.status(404).json({ error: "Produit associé introuvable." });
  }

  const oldQty = arrival.quantite;
  const newQty = parseInt(quantite);
  const diff = newQty - oldQty;

  // Update arrival
  arrival.quantite = newQty;
  // Adjust central product stock
  prod.stock = Math.max(0, (prod.stock || 0) + diff);

  // Log in audit log
  localAuditLogs.unshift({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    action: "Modification d'entrée de stock",
    details: `L'utilisateur ${auteur_nom || "Stock & Caisse"} a modifié l'entrée de ${prod.nom} de ${oldQty} à ${newQty} PCS.`,
    date: new Date().toISOString().replace("T", " ").substr(0, 16),
    auteur: auteur_nom || "Stock & Caisse"
  });

  res.json({ success: true, arrival });
});

app.delete("/api/stock-arrivals/:id", (req, res) => {
  const { id } = req.params;
  const { auteur_nom } = req.query;

  const arrIdx = localStockArrivals.findIndex(a => a.id === id);
  if (arrIdx === -1) {
    return res.status(404).json({ error: "Arrivage introuvable." });
  }

  const arrival = localStockArrivals[arrIdx];
  const prod = localProduits.find(p => p.id === arrival.produit_id);

  if (prod) {
    prod.stock = Math.max(0, (prod.stock || 0) - arrival.quantite);
  }

  localStockArrivals.splice(arrIdx, 1);

  // Log in audit log
  localAuditLogs.unshift({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    action: "Suppression d'entrée de stock",
    details: `L'utilisateur ${auteur_nom || "Stock & Caisse"} a supprimé l'entrée de ${prod ? prod.nom : "Produit inconnu"} d'une quantité de ${arrival.quantite} PCS.`,
    date: new Date().toISOString().replace("T", " ").substr(0, 16),
    auteur: (auteur_nom as string) || "Stock & Caisse"
  });

  res.json({ success: true });
});

// Clients
app.get("/api/clients", (req, res) => {
  res.json(localClients);
});

app.post("/api/clients", (req, res) => {
  const { nom, telephone, quartier, adresse } = req.body;
  if (!nom || !telephone || !quartier) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  const newClient: Client = {
    id: "c-" + Math.random().toString(36).substr(2, 9),
    nom,
    telephone,
    quartier,
    adresse: adresse || ""
  };
  localClients.push(newClient);
  res.status(201).json(newClient);
});

// Agent stocks (stocks personnels et dépôts locaux)
app.get("/api/agent-stocks", (req, res) => {
  const { agent_id } = req.query;
  if (agent_id) {
    const stocks = localAgentStocks.filter(s => s.agent_id === agent_id);
    return res.json(stocks);
  }
  res.json(localAgentStocks);
});

// Direct stock delivery/distribution from central depot to an agent
app.post("/api/stock/transfer", (req, res) => {
  const { agent_id, produit_id, quantite, auteur_nom } = req.body;
  if (!agent_id || !produit_id || !quantite) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  const parsedQty = parseInt(quantite);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: "La quantité doit être supérieure à 0." });
  }

  const prod = localProduits.find(p => p.id === produit_id);
  if (!prod) {
    return res.status(404).json({ error: "Produit central introuvable." });
  }

  if ((prod.stock || 0) < parsedQty) {
    return res.status(400).json({ error: `Stock central insuffisant (${prod.stock} PCS disponible).` });
  }

  const userObj = localUsers.find(u => u.id === agent_id);
  const agentName = userObj ? userObj.name : "Agent de terrain";

  // Subtract from central warehouse
  prod.stock -= parsedQty;

  // Add to agent's stock
  const idx = localAgentStocks.findIndex(s => s.agent_id === agent_id && s.produit_id === produit_id);
  if (idx !== -1) {
    localAgentStocks[idx].stock += parsedQty;
  } else {
    localAgentStocks.push({
      id: "as-" + Math.random().toString(36).substr(2, 9),
      agent_id,
      produit_id,
      stock: parsedQty
    });
  }

  // Create audit log entry
  localAuditLogs.unshift({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    action: "Livraison Agent",
    details: `Livraison directe de ${parsedQty} PCS de ${prod.nom} de l'entrepôt central vers ${agentName} par ${auteur_nom || "Stock & Caisse"}.`,
    date: new Date().toISOString().replace("T", " ").substr(0, 16),
    auteur: auteur_nom || "Stock & Caisse"
  });

  res.status(200).json({ success: true, message: "Transfert effectué avec succès." });
});

app.post("/api/agent-stocks", (req, res) => {
  const { agent_id, produit_id, stock } = req.body;
  if (!agent_id || !produit_id || stock === undefined) {
    return res.status(400).json({ error: "Données de stock manquantes." });
  }

  const idx = localAgentStocks.findIndex(s => s.agent_id === agent_id && s.produit_id === produit_id);
  if (idx !== -1) {
    localAgentStocks[idx].stock = parseInt(stock);
    return res.json(localAgentStocks[idx]);
  } else {
    const newStock: AgentStock = {
      id: "as-" + Math.random().toString(36).substr(2, 9),
      agent_id,
      produit_id,
      stock: parseInt(stock)
    };
    localAgentStocks.push(newStock);
    return res.status(201).json(newStock);
  }
});

// Reassort requests
app.get("/api/reassorts", (req, res) => {
  const { agent_id } = req.query;
  if (agent_id) {
    return res.json(localReassorts.filter(r => r.agent_id === agent_id));
  }
  res.json(localReassorts);
});

app.post("/api/reassorts", (req, res) => {
  const { agent_id, agent_nom, produit_id, quantite } = req.body;
  if (!agent_id || !produit_id || !quantite) {
    return res.status(400).json({ error: "Informations de réassort incomplètes." });
  }

  const prod = localProduits.find(p => p.id === produit_id);
  if (!prod) {
    return res.status(404).json({ error: "Produit central introuvable." });
  }

  const newReq: ReassortRequest = {
    id: "re-" + Math.random().toString(36).substr(2, 9),
    agent_id,
    agent_nom: agent_nom || "Agent de terrain",
    produit_id,
    produit_nom: prod.nom,
    quantite: parseInt(quantite),
    statut: "en_attente",
    date_creation: new Date().toISOString().split("T")[0]
  };
  localReassorts.push(newReq);
  res.status(201).json(newReq);
});

app.patch("/api/reassorts/:id/statut", (req, res) => {
  const { id } = req.params;
  const { statut } = req.body; // "valide" ou "refuse"

  const rIdx = localReassorts.findIndex(r => r.id === id);
  if (rIdx === -1) {
    return res.status(404).json({ error: "Demande de réassort introuvable." });
  }

  if (statut === "valide") {
    const reqItem = localReassorts[rIdx];
    const prodIdx = localProduits.findIndex(p => p.id === reqItem.produit_id);

    if (prodIdx === -1) {
      return res.status(404).json({ error: "Produit central introuvable." });
    }

    if (localProduits[prodIdx].stock < reqItem.quantite) {
      return res.status(400).json({ error: "Stock central insuffisant pour valider ce réassort." });
    }

    // Déduire du stock central
    localProduits[prodIdx].stock -= reqItem.quantite;

    // Ajouter au stock de l'agent
    const asIdx = localAgentStocks.findIndex(s => s.agent_id === reqItem.agent_id && s.produit_id === reqItem.produit_id);
    if (asIdx !== -1) {
      localAgentStocks[asIdx].stock += reqItem.quantite;
    } else {
      localAgentStocks.push({
        id: "as-" + Math.random().toString(36).substr(2, 9),
        agent_id: reqItem.agent_id,
        produit_id: reqItem.produit_id,
        stock: reqItem.quantite
      });
    }

    localReassorts[rIdx].statut = "valide";
  } else {
    localReassorts[rIdx].statut = "refuse";
  }

  localReassorts[rIdx].date_traitement = new Date().toISOString().split("T")[0];
  res.json(localReassorts[rIdx]);
});

// Sales
app.get("/api/ventes", (req, res) => {
  const { agent_id } = req.query;
  if (agent_id) {
    return res.json(localVentes.filter(v => v.agent_id === agent_id));
  }
  res.json(localVentes);
});

app.post("/api/ventes", (req, res) => {
  const { client_id, client_nom, quartier, produits, type_paiement, agent_id, agent_nom, commission_taux_custom } = req.body;
  if (!agent_id || !produits || produits.length === 0) {
    return res.status(400).json({ error: "Données de vente incomplètes." });
  }

  // Vérifier et déduire les stocks de l'agent
  for (const item of produits) {
    const agentStockObj = localAgentStocks.find(s => s.agent_id === agent_id && s.produit_id === item.produit_id);
    if (!agentStockObj || agentStockObj.stock < item.quantite) {
      const prodName = localProduits.find(p => p.id === item.produit_id)?.nom || item.produit_id;
      return res.status(400).json({ error: `Stock insuffisant pour le produit : ${prodName} (Disponible: ${agentStockObj?.stock || 0})` });
    }
  }

  // Déduire du stock personnel de l'agent
  for (const item of produits) {
    const sIdx = localAgentStocks.findIndex(s => s.agent_id === agent_id && s.produit_id === item.produit_id);
    if (sIdx !== -1) {
      localAgentStocks[sIdx].stock -= item.quantite;
    }
  }

  // Calcul du total
  let total_usd = 0;
  let total_cdf = 0;
  const processed_produits = [];

  for (const item of produits) {
    const dbProd = localProduits.find(p => p.id === item.produit_id);
    if (!dbProd) continue;

    const item_total = dbProd.prix * item.quantite;
    if (dbProd.devise === "USD") {
      total_usd += item_total;
      total_cdf += item_total * exchangeRate;
    } else {
      total_cdf += item_total;
      total_usd += item_total / exchangeRate;
    }

    processed_produits.push({
      produit_id: dbProd.id,
      produit_nom: dbProd.nom,
      quantite: item.quantite,
      prix_unitaire: dbProd.prix,
      devise: dbProd.devise
    });
  }

  // Commissions dynamiques
  const matchedUser = localUsers.find(u => u.id === agent_id);
  const commission_taux = matchedUser && matchedUser.commission_rate !== undefined 
    ? matchedUser.commission_rate 
    : (commission_taux_custom !== undefined 
       ? commission_taux_custom 
       : (matchedUser?.role === "distributeur" ? 20 : 15));
  const commission_montant_usd = total_usd * (commission_taux / 100);
  const commission_montant_cdf = total_cdf * (commission_taux / 100);

  // Client autocompletion / creation
  let final_client_id = client_id;
  if (!final_client_id && client_nom) {
    const newC = {
      id: "c-" + Math.random().toString(36).substr(2, 9),
      nom: client_nom,
      telephone: req.body.client_telephone || "Non spécifié",
      quartier: quartier || "Ibanda",
      adresse: req.body.client_adresse || ""
    };
    localClients.push(newC);
    final_client_id = newC.id;
  }

  const nouvelleVente: Vente = {
    id: "v-" + Math.random().toString(36).substr(2, 9),
    client_id: final_client_id,
    client_nom: client_nom || "Client de passage",
    quartier: quartier || "Ibanda",
    produits: processed_produits,
    total: parseFloat(total_usd.toFixed(2)),
    total_cdf: Math.round(total_cdf),
    date_vente: new Date().toISOString().split("T")[0],
    agent_id,
    agent_nom: agent_nom || "Vendeur",
    type_paiement: type_paiement || "cash",
    commission_taux,
    commission_montant: parseFloat(commission_montant_usd.toFixed(2)),
    commission_montant_cdf: Math.round(commission_montant_cdf),
    taux_change: exchangeRate,
    statut_paiement: "en_attente" // Caissier must validate
  };

  localVentes.push(nouvelleVente);
  res.status(201).json(nouvelleVente);
});

// Enregistrement de vente ou protocole d'historique (Admin)
app.post("/api/ventes/historique", (req, res) => {
  const {
    nom,
    telephone,
    adresse,
    quartier,
    type,
    montant_total,
    devise,
    statut_paiement,
    date_transaction,
    agent_id,
    ne_pas_impacter_stock
  } = req.body;

  if (!nom || !montant_total || !date_transaction || !agent_id) {
    return res.status(400).json({ error: "Champs requis manquants pour l'import d'historique." });
  }

  // Find or create client
  let final_client_id = "c-" + Math.random().toString(36).substr(2, 9);
  const existingClient = localClients.find(c => c.nom.toLowerCase() === nom.toLowerCase());
  if (existingClient) {
    final_client_id = existingClient.id;
  } else {
    const newC = {
      id: final_client_id,
      nom,
      telephone: telephone || "Non spécifié",
      quartier: quartier || "Ibanda",
      adresse: adresse || "Non spécifiée"
    };
    localClients.push(newC);
  }

  const exchangeRate = 2850;
  const numAmount = parseFloat(montant_total) || 0;
  const total_usd = devise === "USD" ? numAmount : (numAmount / exchangeRate);
  const total_cdf = devise === "CDF" ? numAmount : (numAmount * exchangeRate);

  const matchedUser = localUsers.find(u => u.id === agent_id) || { name: "Justin Ciza (Admin)", role: "admin", id: "u-admin" };
  const agent_nom = matchedUser.name;

  if (type === "client_individuel") {
    const firstProduct = localProduits[0] || { id: "me_std", nom: "M-E STANDARD", prix: 5, devise: "USD" };
    const itemQty = Math.round(total_usd / (firstProduct.prix || 5)) || 1;

    // Deduct stock if NOT selected "ne_pas_impacter_stock"
    if (!ne_pas_impacter_stock) {
      const sIdx = localAgentStocks.findIndex(s => s.agent_id === agent_id && s.produit_id === firstProduct.id);
      if (sIdx !== -1) {
        localAgentStocks[sIdx].stock = Math.max(0, localAgentStocks[sIdx].stock - itemQty);
      }
    }

    const processed_produits = [
      {
        produit_id: firstProduct.id,
        produit_nom: firstProduct.nom + " (Historique)",
        quantite: itemQty,
        prix_unitaire: firstProduct.prix,
        devise: firstProduct.devise
      }
    ];

    const commission_taux = matchedUser.role === "distributeur" ? 20 : matchedUser.role === "vendeur" ? 15 : 0;
    const commission_montant_usd = total_usd * (commission_taux / 100);
    const commission_montant_cdf = total_cdf * (commission_taux / 100);

    const nouvelleVente: Vente = {
      id: "v-" + Math.random().toString(36).substr(2, 9),
      client_id: final_client_id,
      client_nom: nom,
      quartier: quartier || "Ibanda",
      produits: processed_produits,
      total: parseFloat(total_usd.toFixed(2)),
      total_cdf: Math.round(total_cdf),
      date_vente: date_transaction,
      agent_id,
      agent_nom,
      type_paiement: "cash",
      commission_taux,
      commission_montant: parseFloat(commission_montant_usd.toFixed(2)),
      commission_montant_cdf: Math.round(commission_montant_cdf),
      taux_change: exchangeRate,
      statut_paiement: statut_paiement === "paye" ? "valide" : "en_attente"
    };

    localVentes.push(nouvelleVente);
    return res.status(201).json({ type: "vente", data: nouvelleVente });
  } else {
    // protocole_entreprise
    if (!ne_pas_impacter_stock) {
      const sIdx = localAgentStocks.findIndex(s => s.agent_id === agent_id && s.produit_id === "me_std");
      if (sIdx !== -1) {
        localAgentStocks[sIdx].stock = Math.max(0, localAgentStocks[sIdx].stock - 1);
      }
    }

    const nouveauProtocole: Protocole = {
      id: "pr-" + Math.random().toString(36).substr(2, 9),
      institution: nom,
      quartier: quartier || "Ibanda",
      agent_id,
      agent_nom,
      date_creation: date_transaction,
      date_echeance: new Date(new Date(date_transaction).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      statut: "valide",
      statut_paiement: statut_paiement === "paye" ? "total" : (statut_paiement === "partiel" ? "partiel" : "non_paye"),
      kit_type: "standard",
      notes: "Enregistrement historique manuel (Archive papier).",
      montant_du_usd: parseFloat(total_usd.toFixed(2)),
      montant_du_cdf: Math.round(total_cdf),
      montant_paye_usd: statut_paiement === "paye" ? parseFloat(total_usd.toFixed(2)) : (statut_paiement === "partiel" ? parseFloat((total_usd / 2).toFixed(2)) : 0),
      montant_paye_cdf: statut_paiement === "paye" ? Math.round(total_cdf) : (statut_paiement === "partiel" ? Math.round(total_cdf / 2) : 0),
      taux_change: exchangeRate,
      beneficiaires: [
        {
          nom: "Bénéficiaire Principal (" + nom + ")",
          telephone: telephone || "Non spécifié",
          adresse: adresse || "Non spécifiée",
          produits: [
            {
              produit_id: "me_std",
              produit_nom: "M-E STANDARD (Historique)",
              quantite: 1,
              prix_unitaire: parseFloat(total_usd.toFixed(2)),
              devise: "USD"
            }
          ],
          total_usd: parseFloat(total_usd.toFixed(2)),
          total_cdf: Math.round(total_cdf)
        }
      ],
      versements: []
    };

    localProtocoles.push(nouveauProtocole);
    return res.status(201).json({ type: "protocole", data: nouveauProtocole });
  }
});

// Update sales status (Caissier validation)
app.patch("/api/ventes/:id/statut", (req, res) => {
  const { id } = req.params;
  const { statut_paiement } = req.body; // "valide"
  const idx = localVentes.findIndex(v => v.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Vente introuvable." });
  }
  localVentes[idx].statut_paiement = statut_paiement || "valide";
  res.json(localVentes[idx]);
});

// Protocols (Vendeur)
app.get("/api/protocoles", (req, res) => {
  res.json(localProtocoles);
});

app.post("/api/protocoles", (req, res) => {
  const { institution, quartier, agent_id, agent_nom, kit_type, beneficiaires, notes } = req.body;
  if (!institution || !agent_id || !beneficiaires || beneficiaires.length === 0) {
    return res.status(400).json({ error: "Données de protocole incomplètes." });
  }

  let total_usd = 0;
  let total_cdf = 0;

  const processed_beneficiaires = beneficiaires.map((b: any) => {
    let b_usd = 0;
    let b_cdf = 0;
    const b_prods = b.produits.map((p: any) => {
      const dbProd = localProduits.find(prd => prd.id === p.produit_id);
      const prx = dbProd ? dbProd.prix : 5;
      const dev = dbProd ? dbProd.devise : "USD";
      const total_item = prx * (p.quantite || 0);

      if (dev === "USD") {
        b_usd += total_item;
        b_cdf += total_item * exchangeRate;
      } else {
        b_cdf += total_item;
        b_usd += total_item / exchangeRate;
      }

      return {
        produit_id: p.produit_id,
        produit_nom: dbProd ? dbProd.nom : "Inconnu",
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
      adresse: b.adresse || "Non spécifié",
      produits: b_prods,
      total_usd: parseFloat(b_usd.toFixed(2)),
      total_cdf: Math.round(b_cdf)
    };
  });

  // Date d'échéance par défaut : 30 jours après création
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const date_echeance = dueDate.toISOString().split("T")[0];

  const newProtocole: Protocole = {
    id: "pr-" + Math.random().toString(36).substr(2, 9),
    institution,
    quartier: quartier || "Ibanda",
    agent_id,
    agent_nom: agent_nom || "Vendeur",
    date_creation: new Date().toISOString().split("T")[0],
    date_echeance,
    statut: "en_attente",
    statut_paiement: "non_paye",
    kit_type: kit_type || "standard",
    notes: notes || "",
    montant_du_usd: parseFloat(total_usd.toFixed(2)),
    montant_du_cdf: Math.round(total_cdf),
    montant_paye_usd: 0,
    montant_paye_cdf: 0,
    taux_change: exchangeRate,
    beneficiaires: processed_beneficiaires,
    versements: []
  };

  localProtocoles.push(newProtocole);
  res.status(201).json(newProtocole);
});

// Admin validation of protocols, auto-converting to effective sales with immediate commission!
app.post("/api/protocoles/:id/statut", (req, res) => {
  const { id } = req.params;
  const { statut } = req.body; // "valide" ou "rejete"

  const idx = localProtocoles.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Protocole introuvable." });
  }

  localProtocoles[idx].statut = statut;

  // Si validé, convertir en ventes réelles d'après les bénéficiaires !
  if (statut === "valide") {
    const prot = localProtocoles[idx];
    const matchedUser = localUsers.find(u => u.id === prot.agent_id);
    const commission_taux = matchedUser && matchedUser.commission_rate !== undefined 
      ? matchedUser.commission_rate 
      : (matchedUser?.role === "distributeur" ? 20 : 15);

    prot.beneficiaires.forEach(b => {
      // Déduire du stock personnel de l'agent
      if (b.produits) {
        b.produits.forEach(item => {
          const sIdx = localAgentStocks.findIndex(s => s.agent_id === prot.agent_id && s.produit_id === item.produit_id);
          if (sIdx !== -1) {
            localAgentStocks[sIdx].stock -= item.quantite;
          } else {
            localAgentStocks.push({
              id: "as-" + Math.random().toString(36).substr(2, 9),
              agent_id: prot.agent_id,
              produit_id: item.produit_id,
              stock: -item.quantite
            });
          }
        });
      }

      const venteId = "v-pr-" + Math.random().toString(36).substr(2, 5);
      const commission_usd = b.total_usd * (commission_taux / 100);
      const commission_cdf = b.total_cdf * (commission_taux / 100);

      const nouvelleVente: Vente = {
        id: venteId,
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
        commission_taux,
        commission_montant: parseFloat(commission_usd.toFixed(2)),
        commission_montant_cdf: Math.round(commission_cdf),
        taux_change: prot.taux_change || exchangeRate,
        statut_paiement: "valide" // Validé immédiatement pour créditer la commission au vendeur !
      };

      localVentes.push(nouvelleVente);
    });
  }

  res.json({ success: true, protocole: localProtocoles[idx] });
});

// Ajouter un versement / acompte à un protocole
app.post("/api/protocoles/:id/versements", (req, res) => {
  const { id } = req.params;
  const { montant, moyen_paiement, devise } = req.body;

  if (!montant || !moyen_paiement || !devise) {
    return res.status(400).json({ error: "Données de versement incomplètes." });
  }

  const idx = localProtocoles.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Protocole introuvable." });
  }

  const prot = localProtocoles[idx];
  const newVersement = {
    id: "vst-" + Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString().split("T")[0],
    montant: parseFloat(montant),
    devise,
    moyen_paiement
  };

  prot.versements.push(newVersement);

  // Recalculer les montants payés
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

  // Déterminer le statut de paiement
  const tolerance = 0.05;
  if (prot.montant_paye_usd >= (prot.montant_du_usd - tolerance)) {
    prot.statut_paiement = "total";
  } else if (prot.montant_paye_usd > 0) {
    prot.statut_paiement = "partiel";
  } else {
    prot.statut_paiement = "non_paye";
  }

  res.json({ success: true, protocole: prot });
});

// Ajouter dynamiquement un nouveau bénéficiaire à un protocole à tout moment
app.post("/api/protocoles/:id/beneficiaires", (req, res) => {
  const { id } = req.params;
  const { nom, telephone, adresse, produits, date_entree } = req.body;

  if (!nom || !produits || produits.length === 0) {
    return res.status(400).json({ error: "Données du bénéficiaire incomplètes." });
  }

  const idx = localProtocoles.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Protocole introuvable." });
  }

  const prot = localProtocoles[idx];

  // Traiter les produits et calculer les totaux du bénéficiaire
  let b_usd = 0;
  let b_cdf = 0;
  const b_prods = produits.map((p: any) => {
    const dbProd = localProduits.find(prd => prd.id === p.produit_id);
    const prx = dbProd ? dbProd.prix : 5;
    const dev = dbProd ? dbProd.devise : "USD";
    const total_item = prx * (p.quantite || 0);

    if (dev === "USD") {
      b_usd += total_item;
      b_cdf += total_item * prot.taux_change;
    } else {
      b_cdf += total_item;
      b_usd += total_item / prot.taux_change;
    }

    return {
      produit_id: p.produit_id,
      produit_nom: dbProd ? dbProd.nom : "Inconnu",
      quantite: p.quantite,
      prix_unitaire: prx,
      devise: dev
    };
  });

  const newBeneficiaire = {
    nom,
    telephone: telephone || "Non spécifié",
    adresse: adresse || "Non spécifié",
    produits: b_prods,
    total_usd: parseFloat(b_usd.toFixed(2)),
    total_cdf: Math.round(b_cdf),
    date_entree: date_entree || new Date().toISOString().split("T")[0]
  };

  prot.beneficiaires.push(newBeneficiaire);

  // Recalculer les totaux du protocole
  let total_usd = 0;
  let total_cdf = 0;
  prot.beneficiaires.forEach(b => {
    total_usd += b.total_usd;
    total_cdf += b.total_cdf;
  });

  prot.montant_du_usd = parseFloat(total_usd.toFixed(2));
  prot.montant_du_cdf = Math.round(total_cdf);

  // Mettre à jour le statut du paiement
  const tolerance = 0.05;
  if (prot.montant_paye_usd >= (prot.montant_du_usd - tolerance)) {
    prot.statut_paiement = "total";
  } else if (prot.montant_paye_usd > 0) {
    prot.statut_paiement = "partiel";
  } else {
    prot.statut_paiement = "non_paye";
  }

  // Si le protocole a déjà été validé par l'Admin, l'ajout d'un bénéficiaire
  // déclenche immédiatement le calcul et crédit de commission en créant la vente associée !
  if (prot.statut === "valide") {
    // Déduire du stock personnel de l'agent pour ce bénéficiaire dynamique
    if (b_prods) {
      b_prods.forEach(item => {
        const sIdx = localAgentStocks.findIndex(s => s.agent_id === prot.agent_id && s.produit_id === item.produit_id);
        if (sIdx !== -1) {
          localAgentStocks[sIdx].stock -= item.quantite;
        } else {
          localAgentStocks.push({
            id: "as-" + Math.random().toString(36).substr(2, 9),
            agent_id: prot.agent_id,
            produit_id: item.produit_id,
            stock: -item.quantite
          });
        }
      });
    }

    const venteId = "v-pr-add-" + Math.random().toString(36).substr(2, 5);
    const matchedUser = localUsers.find(u => u.id === prot.agent_id);
    const commission_taux = matchedUser && matchedUser.commission_rate !== undefined 
      ? matchedUser.commission_rate 
      : (matchedUser?.role === "distributeur" ? 20 : 15);
    const commission_usd = b_usd * (commission_taux / 100);
    const commission_cdf = b_cdf * (commission_taux / 100);

    const nouvelleVente: Vente = {
      id: venteId,
      client_id: undefined,
      client_nom: `${prot.institution} - ${nom}`,
      quartier: prot.quartier,
      produits: b_prods,
      total: parseFloat(b_usd.toFixed(2)),
      total_cdf: Math.round(b_cdf),
      date_vente: new Date().toISOString().split("T")[0],
      agent_id: prot.agent_id,
      agent_nom: prot.agent_nom,
      type_paiement: "credit",
      commission_taux,
      commission_montant: parseFloat(commission_usd.toFixed(2)),
      commission_montant_cdf: Math.round(commission_cdf),
      taux_change: prot.taux_change || exchangeRate,
      statut_paiement: "valide"
    };

    localVentes.push(nouvelleVente);
  }

  res.json({ success: true, protocole: prot });
});

// Paychecks/Factures
app.get("/api/paiements/factures", (req, res) => {
  res.json(localFactures);
});

app.post("/api/paiements/factures", (req, res) => {
  const { agent_id, agent_nom, mois, ventes_count, total_commission_usd, total_commission_cdf, salaire_fixe } = req.body;
  const newF: FactureAgent = {
    id: "f-" + Math.random().toString(36).substr(2, 9),
    agent_id,
    agent_nom,
    mois: mois || "Août 2026",
    date_creation: new Date().toISOString().split("T")[0],
    ventes_count: parseInt(ventes_count) || 0,
    total_commission_usd: parseFloat(total_commission_usd) || 0,
    total_commission_cdf: parseInt(total_commission_cdf) || 0,
    salaire_fixe: parseFloat(salaire_fixe) || 0,
    statut: "en_attente"
  };
  localFactures.push(newF);
  res.status(201).json(newF);
});

app.post("/api/paiements/factures/:id/valider", (req, res) => {
  const { id } = req.params;
  const idx = localFactures.findIndex(f => f.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Fiche de paie introuvable." });
  }
  localFactures[idx].statut = "paye";
  localFactures[idx].date_paiement = new Date().toISOString().split("T")[0];
  res.json(localFactures[idx]);
});

// Statistics
app.get("/api/stats", (req, res) => {
  const { agent_id } = req.query;
  let ventes = [...localVentes];
  let protocoles = [...localProtocoles];
  let clients = [...localClients];

  if (agent_id) {
    ventes = ventes.filter(v => v.agent_id === agent_id);
    protocoles = protocoles.filter(p => p.agent_id === agent_id);
  }

  // Calculs financiers consolidés par mode de paiement
  let totalVentesCash = ventes.filter(v => v.type_paiement === "cash" && v.statut_paiement === "valide").reduce((acc, v) => acc + v.total, 0);
  const totalVentesCredit = ventes.filter(v => v.type_paiement === "credit").reduce((acc, v) => acc + v.total, 0);
  let totalVentesMobile = ventes.filter(v => ["mpesa", "airtel_money", "orange_money"].includes(v.type_paiement) && v.statut_paiement === "valide").reduce((acc, v) => acc + v.total, 0);

  // Intégrer les versements d'acomptes/paiements des protocoles d'entreprises validés
  localProtocoles.forEach(p => {
    // Ne comptabiliser que les versements réels enregistrés dans la caisse
    p.versements.forEach(v => {
      const amtUSD = v.devise === "USD" ? v.montant : v.montant / (p.taux_change || exchangeRate);
      if (v.moyen_paiement === "cash") {
        totalVentesCash += amtUSD;
      } else if (["mpesa", "airtel_money", "orange_money"].includes(v.moyen_paiement)) {
        totalVentesMobile += amtUSD;
      }
    });
  });

  const chiffreAffaires = totalVentesCash + totalVentesCredit + totalVentesMobile;
  const totalCommissions = ventes.reduce((acc, v) => acc + (v.commission_montant || 0), 0);

  // Alerte J-5 pour l'Admin (Protocole impayé ou partiel arrivant à échéance dans 5 jours ou moins)
  const todayStr = new Date().toISOString().split("T")[0];
  const alertesActives = localProtocoles.filter(p => {
    if (p.statut_paiement === "total") return false;
    if (!p.date_echeance) return false;
    const due = new Date(p.date_echeance);
    const curr = new Date(todayStr);
    due.setHours(0,0,0,0);
    curr.setHours(0,0,0,0);
    const diffTime = due.getTime() - curr.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  }).length;

  // Calcul des bénéficiaires par quartiers
  const statsQuartiers = ["Panzi", "Kadutu", "Ibanda"].map(q => {
    const ventesQuartier = ventes.filter(v => v.quartier && v.quartier.toLowerCase() === q.toLowerCase());
    const caQuartier = ventesQuartier.reduce((acc, v) => acc + v.total, 0);
    const clientsQuartier = clients.filter(c => c.quartier && c.quartier.toLowerCase() === q.toLowerCase()).length;
    return {
      quartier: q,
      ca: parseFloat(caQuartier.toFixed(2)),
      ventes_nombre: ventesQuartier.length,
      clients_nombre: clientsQuartier
    };
  });

  res.json({
    chiffre_affaires: parseFloat(chiffreAffaires.toFixed(2)),
    total_ventes_cash: parseFloat(totalVentesCash.toFixed(2)),
    total_ventes_credit: parseFloat(totalVentesCredit.toFixed(2)),
    total_ventes_mobile: parseFloat(totalVentesMobile.toFixed(2)),
    total_commissions: parseFloat(totalCommissions.toFixed(2)),
    nombre_ventes: ventes.length,
    nombre_clients: clients.length,
    nombre_promesses: localReassorts.filter(r => r.statut === "en_attente").length, // repurposed for pending stock requests
    nombre_alertes: alertesActives,
    stats_quartiers: statsQuartiers
  });
});

// Vite middleware for static assets development & spa fallback
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  });
} else {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
