import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  TrendingUp,
  Coins,
  Users,
  ShoppingBag,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Search,
  Plus,
  Phone,
  LogOut,
  UserCheck,
  AlertCircle,
  Activity,
  Clock,
  Loader2,
  RefreshCw,
  Building,
  Trash2,
  Eye,
  Check,
  X,
  ClipboardList,
  Pencil,
  UserPlus,
  Package,
  FileSpreadsheet,
  AlertTriangle,
  FolderOpen,
  FolderClosed,
  Bell,
  Settings,
  Lock,
  Globe,
  KeyRound,
  UserX,
  LogIn,
  Send,
  Database,
  User as UserIcon
} from "lucide-react";
import { User, Produit, Client, Vente, Protocole, Stats, DBStatus, FactureAgent, AgentStock, ReassortRequest, UserRole, AppNotification } from "./types";
import { BUKAVU_LOCATIONS } from "./locations";
import { AvenueSelector } from "./components/AvenueSelector";
import { ROLE_LABELS, ROLE_COLORS, STYLES, KIT_OPTIONS, PAYMENT_MODE_LABELS } from "./data";
import { supabase, isSupabaseConfigured, db } from "./supabaseClient";

const COMPAGNIE_INFO = {
  nom: "STOP PALUDISME",
  nomEts: "ETS LUMIÈRE DU CIEL",
  rccm: "N° RCCM : CD/BKV/RCCM/23-A-01-303",
  siege: "Siège social : 12, Av. Kibombo, Bukavu, Sud-Kivu | RDC",
  email: "Lumiereduciel.cd@gmail.com",
  telephones: ["+243 904 259 671", "+243 999 073 461"],
};

export default function App() {
  // --- ÉTATS D'AUTHENTIFICATION ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("stop_palu_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Nouveaux modes d'authentification (Login / Inscription / Mot de passe oublié / Google)
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [regType, setRegType] = useState<"email" | "phone">("email");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCountryCode, setRegCountryCode] = useState("+243");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Workflow de validation admin
  const [validatingUser, setValidatingUser] = useState<User | null>(null);
  const [validationRole, setValidationRole] = useState<UserRole>("vendeur");
  const [validationCommission, setValidationCommission] = useState<number>(15);
  const [validationLoading, setValidationLoading] = useState(false);

  // --- ÉTATS MESSAGERIE INTERNE, NOTIFICATIONS & PARAMÈTRES ---
  const [dbNotifications, setDbNotifications] = useState<AppNotification[]>([]);
  const [userFilterStatut, setUserFilterStatut] = useState<"tous" | "en_attente" | "valide" | "rejete">("tous");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTargetRole, setBroadcastTargetRole] = useState<string>("all");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhone(user.telephone || "");
    }
  }, [user]);

  // Nettoyage sécurité pour garantir le mode clair par défaut
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("stop_palu_dark_mode");
  }, []);

  // Écouteur de session Supabase (notamment pour retour OAuth Google)
  useEffect(() => {
    if (!supabase) return;
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        try {
          const uEmail = session.user.email || "";
          const uName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || uEmail.split("@")[0] || "Utilisateur Google";
          const uPhone = session.user.phone || session.user.user_metadata?.phone || "";

          // Vérification du profil
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          let userStatus = profile?.statut;
          let userRole: UserRole = profile?.role || "vendeur";
          let userComm = profile?.commission_rate ?? (userRole === "distributeur" ? 20 : userRole === "vendeur" ? 15 : 0);

          if (!profile) {
            userStatus = "en_attente";
            await supabase.from("profiles").upsert({
              id: session.user.id,
              email: uEmail,
              name: uName,
              telephone: uPhone,
              role: userRole,
              statut: "en_attente",
              created_at: new Date().toISOString()
            });

            // Synchroniser avec la base autonome
            await db.registerUser({
              name: uName,
              email: uEmail,
              telephone: uPhone,
              password: "google_oauth_sync",
              regType: "email"
            }).catch(() => {});
          }

          if (userStatus === "en_attente") {
            await supabase.auth.signOut();
            setLoginError("Votre compte Google a bien été enregistré. Il est actuellement en attente de validation par l'administrateur.");
            return;
          }

          if (userStatus === "rejete") {
            await supabase.auth.signOut();
            setLoginError("Votre demande d'accès a été rejetée par l'administrateur.");
            return;
          }

          const loggedInUser: User = {
            id: session.user.id,
            email: uEmail,
            name: profile?.name || uName,
            role: userRole,
            commission_rate: userComm,
            telephone: profile?.telephone || uPhone,
            statut: "valide"
          };
          setUser(loggedInUser);
          localStorage.setItem("stop_palu_user", JSON.stringify(loggedInUser));
        } catch (e: any) {
          console.warn("Erreur synchronisation profil Google:", e);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // --- ÉTATS GÉNÉRAUX DE L'APP ---
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // --- ÉTATS DES DONNÉES ---
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [protocoles, setProtocoles] = useState<Protocole[]>([]);
  const [factures, setFactures] = useState<FactureAgent[]>([]);
  const [reassorts, setReassorts] = useState<ReassortRequest[]>([]);
  const [agentStocks, setAgentStocks] = useState<AgentStock[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(2850);

  // --- FILTRES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQuartier, setFilterQuartier] = useState("");

  // --- FORMULAIRES DE VENTE (VENDEUR / DISTRIBUTEUR) ---
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientQuartier, setClientQuartier] = useState("Ibanda");
  const [clientAdresse, setClientAdresse] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [venteProduits, setVenteProduits] = useState<Array<{ produit_id: string; quantite: number }>>([
    { produit_id: "", quantite: 1 }
  ]);
  const [typePaiement, setTypePaiement] = useState<Vente["type_paiement"]>("cash");
  const [venteLoading, setVenteLoading] = useState(false);
  const [venteSuccess, setVenteSuccess] = useState("");
  const [venteError, setVenteError] = useState("");

  // --- FORMULAIRES PROTOCOLES (EXCLUSIF VENDEUR) ---
  const [protoInstitution, setProtoInstitution] = useState("");
  const [protoQuartier, setProtoQuartier] = useState("Panzi");
  const [protoAvenue, setProtoAvenue] = useState("");
  const [protoNotes, setProtoNotes] = useState("");
  const [protoBeneficiaires, setProtoBeneficiaires] = useState<Array<{
    nom: string;
    telephone: string;
    adresse: string;
    produits: Array<{ produit_id: string; quantite: number }>;
  }>>([{ nom: "", telephone: "", adresse: "", produits: [{ produit_id: "", quantite: 1 }] }]);
  const [protoLoading, setProtoLoading] = useState(false);
  const [protoSuccess, setProtoSuccess] = useState("");
  const [protoError, setProtoError] = useState("");

  // --- ÉTATS DÉTAILS & INTERACTIONS PROTOCOLES (ADMIN) ---
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [selectedSellerProtocol, setSelectedSellerProtocol] = useState<Protocole | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // --- ÉTATS COMMISSION EDIT (ADMIN) ---
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingCommissionVal, setEditingCommissionVal] = useState<string>("");

  // Enregistrement d'un versement
  const [versemMontant, setVersemMontant] = useState<string>("");
  const [versemMoyen, setVersemMoyen] = useState<string>("cash");
  const [versemDevise, setVersemDevise] = useState<string>("USD");
  const [versemLoading, setVersemLoading] = useState<boolean>(false);

  // Ajout de bénéficiaire
  const [newBenefNom, setNewBenefNom] = useState<string>("");
  const [newBenefTel, setNewBenefTel] = useState<string>("");
  const [newBenefAdresse, setNewBenefAdresse] = useState<string>("");
  const [newBenefProduits, setNewBenefProduits] = useState<Array<{ produit_id: string; quantite: number }>>([
    { produit_id: "", quantite: 1 }
  ]);
  const [newBenefLoading, setNewBenefLoading] = useState<boolean>(false);

  // --- FORMULAIRES DE RÉASSORT (AGENT STOCKS) ---
  const [reassortProdId, setReassortProdId] = useState("");
  const [reassortQty, setReassortQty] = useState(1);
  const [reassortLoading, setReassortLoading] = useState(false);

  // --- GESTIONNAIRE DE STOCK : CENTRAL STOCK RESTOCK ---
  const [centralRestockProdId, setCentralRestockProdId] = useState("");
  const [centralRestockQty, setCentralRestockQty] = useState(10);
  const [centralLoading, setCentralLoading] = useState(false);

  // --- ADMIN : ÉDITION PRODUITS ET TAUX ---
  const [newProdNom, setNewProdNom] = useState("");
  const [newProdPrix, setNewProdPrix] = useState(0);
  const [newProdDevise, setNewProdDevise] = useState<"USD" | "CDF">("USD");
  const [newProdType, setNewProdType] = useState<"moustiquaire" | "consommable">("moustiquaire");
  const [newProdStock, setNewProdStock] = useState(100);
  const [newProdDesc, setNewProdDesc] = useState("");
  const [rateEditVal, setRateEditVal] = useState("2850");
  const [rateLoading, setRateLoading] = useState(false);

  // --- STATS D'ÉDITION POUR LES PRODUITS ---
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProdNom, setEditingProdNom] = useState<string>("");
  const [editingProdPrix, setEditingProdPrix] = useState<number>(0);
  const [editingProdDevise, setEditingProdDevise] = useState<"USD" | "CDF">("USD");
  const [editingProdType, setEditingProdType] = useState<"moustiquaire" | "consommable">("moustiquaire");

  // --- HISTORIQUE / IMPORTATION PAPIER ---
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [histNom, setHistNom] = useState("");
  const [histTel, setHistTel] = useState("");
  const [histAdresse, setHistAdresse] = useState("");
  const [histQuartier, setHistQuartier] = useState("Ibanda");
  const [histType, setHistType] = useState<"client_individuel" | "protocole_entreprise">("client_individuel");
  const [histMontantTotal, setHistMontantTotal] = useState("");
  const [histDevise, setHistDevise] = useState<"USD" | "CDF">("USD");
  const [histStatutPaiement, setHistStatutPaiement] = useState<"paye" | "partiel" | "non_paye">("paye");
  const [histDateTransaction, setHistDateTransaction] = useState(new Date().toISOString().split("T")[0]);
  const [histAgentId, setHistAgentId] = useState("");
  const [histNePasImpacterStock, setHistNePasImpacterStock] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [histSuccess, setHistSuccess] = useState("");
  const [histError, setHistError] = useState("");

  // --- TRAÇABILITÉ & ARRIvAGES DU STOCK CENTRAL ---
  const [stockArrivals, setStockArrivals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [editingArrivalId, setEditingArrivalId] = useState<string | null>(null);
  const [editingArrivalQty, setEditingArrivalQty] = useState<number>(0);
  const [editingArrivalProdNom, setEditingArrivalProdNom] = useState<string>("");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [adminHistFilterAgent, setAdminHistFilterAgent] = useState<string>("");
  const [adminHistFilterType, setAdminHistFilterType] = useState<string>("");

  // --- ADMIN : GESTION UTILISATEURS ---
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<User["role"]>("vendeur");
  const [userLoading, setUserLoading] = useState(false);

  // --- MODAL & PRINT FICHE DE PAIE ---
  const [activeFacture, setActiveFacture] = useState<FactureAgent | null>(null);
  const [selectedVenteForReceipt, setSelectedVenteForReceipt] = useState<Vente | null>(null);
  const [selectedProtocolForFiche, setSelectedProtocolForFiche] = useState<Protocole | null>(null);
  const [newBenefDateEntree, setNewBenefDateEntree] = useState<string>(new Date().toISOString().split("T")[0]);

  // --- DIRECT TRANSFER STATE ---
  const [transferAgentId, setTransferAgentId] = useState("");
  const [transferProductId, setTransferProductId] = useState("");
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferLoading, setTransferLoading] = useState(false);

  // --- TOASTS & HIGHLIGHTED STATES ---
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "info" }>>([]);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<any>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // --- CLIENT AUTOCOMPLETE FILTER ---
  const filteredClientsForSearch = useMemo(() => {
    if (!clientSearchTerm.trim()) return [];
    return clients.filter(c => c.nom.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  }, [clientSearchTerm, clients]);

  // --- MERGED UNIFIED CLIENTS (ADMIN VUE CENTRALISÉE) ---
  const unifiedClients = useMemo(() => {
    const list: Array<{
      id: string;
      nom: string;
      telephone: string;
      quartier: string;
      adresse: string;
      type: string;
      ajouteParNom: string;
      ajouteParRole: string;
    }> = [];

    // 1. Clients des ventes directes / terrain / distributeurs
    clients.forEach(c => {
      const assocVente = ventes.find(v => v.client_id === c.id);
      let agentName = "Justin Ciza";
      let agentRole = "admin";

      if (assocVente) {
        agentName = assocVente.agent_nom;
        const matchedUser = allUsers.find(u => u.id === assocVente.agent_id || u.name === assocVente.agent_nom);
        if (matchedUser) {
          agentRole = matchedUser.role;
        } else {
          agentRole = assocVente.commission_taux === 20 ? "distributeur" : "vendeur";
        }
      }

      list.push({
        id: c.id,
        nom: c.nom,
        telephone: c.telephone || "Non spécifié",
        quartier: c.quartier || "Ibanda",
        adresse: c.adresse || "Non spécifiée",
        type: agentRole === "distributeur" ? "Point de Distribution" : "Vente Directe",
        ajouteParNom: agentName,
        ajouteParRole: agentRole
      });
    });

    // 2. Bénéficiaires au sein des protocoles d'entreprise
    protocoles.forEach(p => {
      const matchedUser = allUsers.find(u => u.id === p.agent_id || u.name === p.agent_nom);
      const agentRole = matchedUser ? matchedUser.role : "vendeur";

      p.beneficiaires.forEach((b, bIdx) => {
        list.push({
          id: `proto-${p.id}-${b.nom}-${bIdx}`,
          nom: b.nom,
          telephone: b.telephone || "Non spécifié",
          quartier: p.quartier || "Ibanda",
          adresse: b.adresse || "Non spécifiée",
          type: `Protocole (${p.institution})`,
          ajouteParNom: p.agent_nom,
          ajouteParRole: agentRole
        });
      });
    });

    return list;
  }, [clients, ventes, protocoles, allUsers]);

  // --- VENTES ET PROTOCOLES COMBINÉS POUR LE VENDEUR ---
  const combinedRecentItems = useMemo(() => {
    const list: Array<{
      type: "vente" | "protocole";
      id: string;
      title: string;
      subtitle: string;
      date: string;
      amountUSD: number;
      badgeText: string;
      badgeColor: string;
      rawItem: any;
    }> = [];

    ventes.forEach(v => {
      list.push({
        type: "vente",
        id: v.id,
        title: v.client_nom,
        subtitle: `${v.type_paiement.toUpperCase()}`,
        date: v.date_vente,
        amountUSD: v.total,
        badgeText: v.statut_paiement === "valide" ? "Validée" : "En attente",
        badgeColor: v.statut_paiement === "valide" ? "text-emerald-600 bg-emerald-50" : "text-amber-500 bg-amber-50/60",
        rawItem: v
      });
    });

    protocoles.forEach(p => {
      list.push({
        type: "protocole",
        id: p.id,
        title: `Dossier Protocole - ${p.institution}`,
        subtitle: `${p.beneficiaires.length} Bénéficiaire(s)`,
        date: p.date_creation,
        amountUSD: p.montant_du_usd,
        badgeText: p.statut === "valide" ? "Validé" : p.statut === "rejete" ? "Rejeté" : "En attente",
        badgeColor: p.statut === "valide" ? "text-emerald-700 bg-emerald-100" : p.statut === "rejete" ? "text-red-700 bg-red-100" : "text-amber-700 bg-amber-100",
        rawItem: p
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [ventes, protocoles]);

  // --- CHARGEMENT DU STATUT DB ET INITIALISATION DES TABS ---
  useEffect(() => {
    fetchDbStatus();
    if (user) {
      loadAllData();
      // Set correct default tab per role
      if (user.role === "admin") setActiveTab("dashboard");
      else if (user.role === "vendeur" || user.role === "distributeur") setActiveTab("ventes");
      else if (user.role === "stock_caissier") setActiveTab("magasin_central");
    }
  }, [user]);

  const fetchDbStatus = async () => {
    setDbStatus({
      supabaseConfigured: isSupabaseConfigured,
      mode: isSupabaseConfigured ? "Supabase Cloud Autonome" : "Base Locale Autonome",
      details: isSupabaseConfigured ? "Connecté à https://rgbdhanxswglgflbkazs.supabase.co" : "Stockage localisé autonome pour APK mobile"
    });
  };

  const loadAllData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const isAgent = user.role === "vendeur" || user.role === "distributeur";
      const agentId = isAgent ? user.id : undefined;

      const [
        fetchedStats,
        fetchedProds,
        fetchedClients,
        fetchedVentes,
        fetchedProt,
        fetchedFact,
        fetchedRate,
        fetchedStocks,
        fetchedReassorts,
        fetchedUsers,
        arrivalsData,
        fetchedNotifs
      ] = await Promise.all([
        db.calculateStats(agentId),
        db.getProduits(),
        db.getClients(),
        db.getVentes(agentId),
        db.getProtocoles(agentId),
        db.getFactures(agentId),
        db.getExchangeRate(),
        db.getAgentStocks(agentId),
        db.getReassorts(agentId),
        db.getUsers(),
        db.getStockArrivalsAndLogs(),
        db.getNotifications(user.role, user.id)
      ]);

      setStats(fetchedStats);
      setProduits(fetchedProds);
      setClients(fetchedClients);
      setVentes(fetchedVentes);
      setProtocoles(fetchedProt);
      setFactures(fetchedFact);
      setExchangeRate(fetchedRate);
      setRateEditVal(fetchedRate.toString());
      setAgentStocks(fetchedStocks);
      setReassorts(fetchedReassorts);
      setAllUsers(fetchedUsers);
      setStockArrivals(arrivalsData.arrivals || []);
      setAuditLogs(arrivalsData.auditLogs || []);
      setDbNotifications(fetchedNotifs || []);
    } catch (err) {
      console.error("Erreur de chargement des données:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // --- ACTIONS AUTHENTIFICATION ---
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Veuillez remplir tous les champs.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");

    try {
      const loggedUser = await db.loginWithEmail(loginEmail, loginPassword);
      setUser(loggedUser);
      localStorage.setItem("stop_palu_user", JSON.stringify(loggedUser));
    } catch (err: any) {
      setLoginError(err.message || "Erreur lors de la connexion.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (!regName.trim()) {
      setRegError("Veuillez saisir votre nom complet.");
      return;
    }
    if (regType === "email" && !regEmail.trim()) {
      setRegError("Veuillez saisir une adresse email valide.");
      return;
    }
    if (regType === "phone" && !regPhone.trim()) {
      setRegError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setRegError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setRegError("Les mots de passe ne correspondent pas.");
      return;
    }

    setRegLoading(true);

    const fullPhone = regType === "phone" ? `${regCountryCode}${regPhone.replace(/\s+/g, "")}` : "";
    const effectiveEmail = regType === "email" ? regEmail.trim().toLowerCase() : `${fullPhone.replace(/[^0-9]/g, "")}@stoppaludisme.cd`;

    try {
      await db.registerUser({
        name: regName.trim(),
        email: effectiveEmail,
        telephone: fullPhone,
        password: regPassword,
        regType
      });

      setRegSuccess("Votre demande d'inscription a été enregistrée avec succès ! Votre compte est actuellement en attente de validation par l'administrateur.");
      setRegName("");
      setRegEmail("");
      setRegPhone("");
      setRegPassword("");
      setRegPasswordConfirm("");
    } catch (err: any) {
      setRegError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError("Veuillez saisir votre adresse email.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      await db.resetPassword(forgotEmail.trim().toLowerCase());
      setForgotSuccess("Un email de réinitialisation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.");
    } catch (err: any) {
      setForgotError(err.message || "Impossible d'envoyer l'email de réinitialisation.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginError("");
    try {
      if (!supabase) {
        throw new Error("Supabase n'est pas configuré.");
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err.message || "Erreur de connexion avec Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Signout Supabase:", e);
    }
    setUser(null);
    localStorage.removeItem("stop_palu_user");
    setActiveTab("dashboard");
  };

  // --- ACTIONS WORKFLOW VALIDATION ADMIN ---
  const handleValidateUserSubmit = async () => {
    if (!validatingUser) return;
    setValidationLoading(true);
    try {
      const updatedUser = await db.validateUser(validatingUser.id, validationRole, validationCommission);
      setAllUsers(prev => prev.map(u => u.id === validatingUser.id ? updatedUser : u));
      showToast(`Compte de ${validatingUser.name} validé avec le rôle ${ROLE_LABELS[validationRole]} !`, "success");
      setValidatingUser(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la validation du compte.", "error");
    } finally {
      setValidationLoading(false);
    }
  };

  const handleRejectUser = async (u: User) => {
    if (!window.confirm(`Confirmez-vous le rejet de la demande d'accès de ${u.name} ?`)) {
      return;
    }
    try {
      const updatedUser = await db.rejectUser(u.id);
      setAllUsers(prev => prev.map(usr => usr.id === u.id ? updatedUser : usr));
      showToast(`La demande de ${u.name} a été rejetée.`, "info");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Erreur lors du rejet.", "error");
    }
  };

  // --- ENREGISTRER VENTE (Vendeur / Distributeur) ---
  const handleAddVente = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation multi-produits
    const validProds = venteProduits.filter(vp => vp.produit_id && vp.quantite > 0);
    if (validProds.length === 0) {
      setVenteError("Veuillez sélectionner au moins un produit.");
      return;
    }

    setVenteLoading(true);
    setVenteSuccess("");
    setVenteError("");

    try {
      await db.createVente({
        client_id: selectedClientId || undefined,
        client_nom: clientSearchTerm,
        quartier: clientQuartier,
        client_telephone: clientTel,
        client_adresse: clientAdresse,
        produits: validProds,
        type_paiement: typePaiement,
        agent_id: user.id,
        agent_nom: user.name,
        commission_taux_custom: user.role === "distributeur" ? 20 : 15
      });

      setVenteSuccess("La vente a été enregistrée avec succès et est en attente de validation caisse !");
      showToast("Vente enregistrée avec succès !", "success");
      setClientSearchTerm("");
      setSelectedClientId("");
      setClientTel("");
      setClientAdresse("");
      setVenteProduits([{ produit_id: "", quantite: 1 }]);
      loadAllData();
    } catch (err: any) {
      setVenteError(err.message || "Erreur lors de l'enregistrement de la vente.");
    } finally {
      setVenteLoading(false);
    }
  };

  // --- SOUMETTRE PROTOCOLE (Vendeur) ---
  const handleAddProtocole = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const invalidBeneficiaires = protoBeneficiaires.some(b => !b.nom || b.produits.some(p => !p.produit_id || p.quantite <= 0));
    if (invalidBeneficiaires) {
      setProtoError("Veuillez remplir tous les champs des bénéficiaires et choisir leurs articles.");
      return;
    }

    setProtoLoading(true);
    setProtoSuccess("");
    setProtoError("");

    try {
      const formattedBeneficiaires = protoBeneficiaires.map(b => ({
        nom: b.nom,
        telephone: b.telephone,
        adresse: b.adresse,
        produits: b.produits.filter(p => p.produit_id && p.quantite > 0)
      }));

      await db.createProtocole({
        institution: protoInstitution,
        quartier: protoQuartier,
        agent_id: user.id,
        agent_nom: user.name,
        kit_type: "standard",
        notes: protoNotes,
        beneficiaires: formattedBeneficiaires
      });

      setProtoSuccess("Le protocole d'entreprise a été créé avec succès et envoyé à l'administration !");
      showToast("Protocole client enregistré !", "success");
      setProtoInstitution("");
      setProtoNotes("");
      setProtoBeneficiaires([{ nom: "", telephone: "", adresse: "", produits: [{ produit_id: "", quantite: 1 }] }]);
      loadAllData();
    } catch (err: any) {
      setProtoError(err.message || "Erreur de création de protocole.");
    } finally {
      setProtoLoading(false);
    }
  };

  // --- SOUMETTRE DEMANDE RÉASSORT (Vendeur / Distributeur) ---
  const handleAddReassort = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !reassortProdId) return;

    setReassortLoading(true);
    try {
      await db.createReassort({
        agent_id: user.id,
        agent_nom: user.name,
        produit_id: reassortProdId,
        quantite: reassortQty
      });
      setReassortProdId("");
      setReassortQty(1);
      loadAllData();
      showToast("Demande de réassort envoyée au gestionnaire !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de réassort.", "error");
    } finally {
      setReassortLoading(false);
    }
  };

  // --- VALIDER COMMANDE RÉASSORT (Gestionnaire Stock) ---
  const handleValidateReassort = async (id: string, approve: boolean) => {
    try {
      await db.updateReassortStatut(id, approve ? "valide" : "refuse");
      loadAllData();
      showToast(approve ? "Réassort validé et stock livré !" : "Réassort refusé.", approve ? "success" : "info");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la validation du réassort.", "error");
    }
  };

  // --- AJOUTER STOCK MAGASIN CENTRAL (Gestionnaire Stock) ---
  const handleCentralRestock = async (e: FormEvent) => {
    e.preventDefault();
    if (!centralRestockProdId || centralRestockQty <= 0) return;

    setCentralLoading(true);
    try {
      await db.createStockArrival(
        centralRestockProdId,
        centralRestockQty,
        user ? `${user.name} (${user.role === "admin" ? "Admin" : "Stock & Caisse"})` : "Stock & Caisse"
      );
      setCentralRestockProdId("");
      setCentralRestockQty(10);
      loadAllData();
      showToast("Nouvel arrivage enregistré au dépôt !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'enregistrement de l'arrivage.", "error");
    } finally {
      setCentralLoading(false);
    }
  };

  // --- LIVRER / DISTRIBUER À UN VENDEUR ---
  const handleDirectTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (!transferAgentId || !transferProductId || transferQty <= 0) {
      alert("Veuillez remplir tous les champs de la livraison.");
      return;
    }

    const selectedTransferProduct = produits.find(p => p.id === transferProductId);
    if (selectedTransferProduct && transferQty > selectedTransferProduct.stock) {
      showToast("Stock central insuffisant pour effectuer cette livraison !", "error");
      return;
    }

    setTransferLoading(true);
    try {
      await db.transferStock(
        transferAgentId,
        transferProductId,
        transferQty,
        user ? `${user.name} (${user.role === "admin" ? "Admin" : "Stock & Caisse"})` : "Stock & Caisse"
      );
      const targetAgentObj = allUsers.find(u => u.id === transferAgentId);
      const agentName = targetAgentObj ? targetAgentObj.name : "l'agent";
      showToast(`Livraison de ${transferQty} pièces effectuée au vendeur ${agentName} !`, "success");

      setTransferAgentId("");
      setTransferProductId("");
      setTransferQty(1);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Une erreur est survenue lors de la livraison.", "error");
    } finally {
      setTransferLoading(false);
    }
  };

  // --- MODIFIER UNE ENTRÉE DE STOCK CENTRAL (Gestionnaire & Admin) ---
  const handleUpdateArrival = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingArrivalId || editingArrivalQty <= 0) return;

    try {
      await db.updateStockArrival(
        editingArrivalId,
        editingArrivalQty,
        user ? `${user.name} (${user.role === "admin" ? "Admin" : "Stock & Caisse"})` : "Stock & Caisse"
      );
      setEditingArrivalId(null);
      loadAllData();
      showToast("Entrée de stock mise à jour !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de modification.", "error");
    }
  };

  // --- SUPPRIMER UNE ENTRÉE DE STOCK CENTRAL (Gestionnaire & Admin) ---
  const handleDeleteArrival = async (id: string) => {
    if (!confirm("Voulez-vous vraiment annuler/supprimer définitivement cette entrée de stock ?")) return;

    try {
      const author = user ? `${user.name} (${user.role === "admin" ? "Admin" : "Stock & Caisse"})` : "Stock & Caisse";
      await db.deleteStockArrival(id, author);
      loadAllData();
      showToast("Entrée de stock supprimée.", "info");
    } catch (err: any) {
      showToast(err.message || "Erreur de suppression.", "error");
    }
  };

  // --- METTRE À JOUR TAUX DE CHANGE (Admin) ---
  const handleUpdateRate = async (e: FormEvent) => {
    e.preventDefault();
    setRateLoading(true);
    try {
      const newRate = await db.setExchangeRate(parseInt(rateEditVal));
      setExchangeRate(newRate);
      loadAllData();
      showToast(`Taux de change mis à jour à 1 USD = ${newRate} CDF`, "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de taux de change.", "error");
    } finally {
      setRateLoading(false);
    }
  };

  // --- AJOUTER UTILISATEUR (Admin) ---
  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    try {
      await db.registerUser({
        name: newUserName,
        email: newUserEmail,
        telephone: "",
        password: newUserPassword,
        regType: "email"
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      loadAllData();
      showToast("Compte créé avec succès !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de création de compte.", "error");
    } finally {
      setUserLoading(false);
    }
  };

  // --- AJOUTER PRODUIT AU CATALOGUE (Admin) ---
  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await db.createProduit({
        nom: newProdNom,
        type: newProdType,
        prix: newProdPrix,
        devise: newProdDevise,
        description: "",
        stock: 0
      });
      setNewProdNom("");
      setNewProdPrix(0);
      setNewProdDesc("");
      setNewProdStock(0);
      loadAllData();
      showToast("Produit ajouté au catalogue !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur d'ajout de produit.", "error");
    }
  };

  // --- SUPPRIMER PRODUIT DU CATALOGUE (Admin) ---
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Voulez-vous vraiment retirer définitivement cet article du catalogue ?")) return;
    try {
      await db.deleteProduit(id);
      loadAllData();
      showToast("Article supprimé du catalogue.", "info");
    } catch (err: any) {
      showToast(err.message || "Erreur de suppression.", "error");
    }
  };

  // --- ENREGISTRER MODIFICATION DE PRODUIT (Admin) ---
  const handleSaveProductEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    try {
      await db.updateProduit(editingProductId, {
        nom: editingProdNom,
        prix: editingProdPrix,
        devise: editingProdDevise,
        type: editingProdType
      });
      setEditingProductId(null);
      loadAllData();
      showToast("Article mis à jour !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de modification.", "error");
    }
  };

  // --- SOUMISSION DE L'HISTORIQUE PAPIER (Admin) ---
  const handleSubmitHistory = async (e: FormEvent) => {
    e.preventDefault();
    setHistError("");
    setHistSuccess("");
    setHistLoading(true);

    if (!histNom || !histMontantTotal || !histDateTransaction || !histAgentId) {
      setHistError("Veuillez remplir tous les champs obligatoires.");
      setHistLoading(false);
      return;
    }

    try {
      const agentMatched = allUsers.find(u => u.id === histAgentId);
      const agentName = agentMatched ? agentMatched.name : "Agent";

      if (histType === "vente") {
        await db.createVente({
          client_nom: histNom,
          quartier: histQuartier,
          client_telephone: histTel,
          client_adresse: histAdresse,
          produits: [],
          type_paiement: "cash",
          agent_id: histAgentId,
          agent_nom: agentName
        });
      } else {
        await db.createProtocole({
          institution: histNom,
          quartier: histQuartier,
          agent_id: histAgentId,
          agent_nom: agentName,
          kit_type: "standard",
          beneficiaires: [{
            nom: histNom,
            telephone: histTel,
            adresse: histAdresse,
            produits: []
          }]
        });
      }

      setHistSuccess("Transaction d'historique enregistrée avec succès !");
      setHistNom("");
      setHistTel("");
      setHistAdresse("");
      setHistMontantTotal("");
      setHistNePasImpacterStock(true);
      loadAllData();
      setTimeout(() => {
        setShowHistoryModal(false);
        setHistSuccess("");
      }, 1500);
    } catch (err: any) {
      setHistError(err.message || "Erreur réseau ou serveur.");
    } finally {
      setHistLoading(false);
    }
  };

  // --- SUPPRIMER UTILISATEUR (Admin) ---
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      await db.deleteUser(id);
      loadAllData();
      showToast("Compte utilisateur supprimé avec succès.", "info");
    } catch (err: any) {
      showToast(err.message || "Erreur de suppression.", "error");
    }
  };

  // --- SAUVEGARDER COMMISSION UTILISATEUR (Admin) ---
  const handleSaveCommission = async (id: string) => {
    try {
      const rateNum = parseFloat(editingCommissionVal);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
        alert("Veuillez saisir un taux de commission valide entre 0 et 100 %.");
        return;
      }
      await db.updateCommissionRate(id, rateNum);
      setEditingUserId(null);
      loadAllData();
      showToast("Taux de commission mis à jour !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour de la commission.", "error");
    }
  };

  // --- VALIDER PAIEMENT VENTE (Caissier) ---
  const handleValidateVentePayment = async (id: string) => {
    try {
      await db.updateVenteStatut(id, "valide");
      loadAllData();
      showToast("Paiement validé par la caisse !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de validation de paiement.", "error");
    }
  };

  // --- GENERER ET VALIDER LES COMPTES/PAIES DE FIN DE MOIS (Admin / Caissier) ---
  const handleGenerateFactures = async () => {
    try {
      const monthlyVentes = ventes.filter(v => v.statut_paiement === "valide");
      const agentMap: Record<string, { name: string; count: number; commUsd: number; commCdf: number; fixed: number }> = {};

      monthlyVentes.forEach(v => {
        if (!agentMap[v.agent_id]) {
          const matchedUser = allUsers.find(u => u.id === v.agent_id);
          const role = matchedUser?.role || "vendeur";
          const fixed = role === "vendeur" ? 40 : 0; // 40$ fixe pour vendeur, 0$ pour distributeur

          agentMap[v.agent_id] = {
            name: v.agent_nom,
            count: 0,
            commUsd: 0,
            commCdf: 0,
            fixed
          };
        }
        agentMap[v.agent_id].count += 1;
        agentMap[v.agent_id].commUsd += v.commission_montant || 0;
        agentMap[v.agent_id].commCdf += v.commission_montant_cdf || 0;
      });

      const promises = Object.entries(agentMap).map(([id, item]) => {
        return db.createFacture({
          agent_id: id,
          agent_nom: item.name,
          ventes_count: item.count,
          total_commission_usd: parseFloat(item.commUsd.toFixed(2)),
          total_commission_cdf: item.commCdf,
          salaire_fixe: item.fixed,
          mois: "Mois en cours"
        });
      });

      await Promise.all(promises);
      loadAllData();
      showToast("Fiches de paie générées avec succès (40$ fixe pour vendeurs) !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la génération des fiches de paie.", "error");
    }
  };

  const handlePayFacture = async (id: string) => {
    try {
      await db.validerFacture(id);
      loadAllData();
      showToast("Paiement de la fiche de paie validé !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de validation paie.", "error");
    }
  };

  // --- VALIDER PROTOCOLE D'ENTREPRISE (Admin) ---
  const handleValidateProtocole = async (id: string, statut: "valide" | "rejete") => {
    try {
      await db.updateProtocoleStatut(id, statut);
      loadAllData();
      showToast(statut === "valide" ? "Protocole validé avec succès ! Ses bénéficiaires ont été convertis en ventes réelles d'entreprise." : "Protocole rejeté.", statut === "valide" ? "success" : "info");
    } catch (err: any) {
      showToast(err.message || "Erreur de validation protocole.", "error");
    }
  };

  // --- ENREGISTRER UN VERSEMENT PROTOCOLE (Admin) ---
  const handleAddProtocolVersement = async (e: FormEvent, protocoleId: string) => {
    e.preventDefault();
    if (!versemMontant || parseFloat(versemMontant) <= 0) return;

    setVersemLoading(true);
    try {
      await db.addVersement(protocoleId, {
        montant: parseFloat(versemMontant),
        moyen_paiement: versemMoyen,
        devise: versemDevise
      });
      setVersemMontant("");
      loadAllData();
      showToast("Versement enregistré avec succès !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur de versement.", "error");
    } finally {
      setVersemLoading(false);
    }
  };

  // --- AJOUTER DYNAMIQUEMENT UN BÉNÉFICIAIRE (Admin / Vendeur) ---
  const handleAddDynamicBeneficiaire = async (e: FormEvent, protocoleId: string) => {
    e.preventDefault();
    if (!newBenefNom) return;

    const validProds = newBenefProduits.filter(p => p.produit_id && p.quantite > 0);
    if (validProds.length === 0) {
      alert("Veuillez sélectionner au moins un produit.");
      return;
    }

    setNewBenefLoading(true);
    try {
      await db.addBeneficiaire(protocoleId, {
        nom: newBenefNom,
        telephone: newBenefTel,
        adresse: newBenefAdresse,
        produits: validProds,
        date_entree: newBenefDateEntree
      });
      setNewBenefNom("");
      setNewBenefTel("");
      setNewBenefAdresse("");
      setNewBenefProduits([{ produit_id: "", quantite: 1 }]);
      setNewBenefDateEntree(new Date().toISOString().split("T")[0]);
      loadAllData();
      showToast("Bénéficiaire ajouté avec succès !", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur d'ajout bénéficiaire.", "error");
    } finally {
      setNewBenefLoading(false);
    }
  };

  // --- DIFFUSER UN MESSAGE INTERNE (Admin) ---
  const handleSendBroadcastMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast("Veuillez remplir le titre et le contenu du message.", "error");
      return;
    }
    setBroadcastLoading(true);
    try {
      await db.sendNotification({
        titre: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        destinataire_role: broadcastTargetRole,
        auteur_nom: user?.name || "Administration",
        type: "info"
      });
      setBroadcastTitle("");
      setBroadcastMessage("");
      showToast("Message interne diffusé avec succès aux agents !", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'envoi du message.", "error");
    } finally {
      setBroadcastLoading(false);
    }
  };

  // --- METTRE À JOUR LE PROFIL PERSONNEL ---
  const handleSaveUserProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      const updated = await db.updateProfile(user.id, {
        name: profileName.trim(),
        telephone: profilePhone.trim()
      });
      setUser(updated);
      localStorage.setItem("stop_palu_user", JSON.stringify(updated));
      showToast("Profil mis à jour avec succès !", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour du profil.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  // --- IMPRESSION DE LA FICHE DE PAIE ---
  const triggerPrintPaycheck = () => {
    const printContent = document.getElementById("printable-paycheck-area");
    if (!printContent) return;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime().toString();
    const printWindow = window.open(windowUrl, uniqueName, "left=50,top=50,width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fiche de Paie - STOP PALUDISME</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #334155; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #059669; padding-bottom: 15px; }
              .header h1 { color: #059669; margin: 0; font-size: 24px; }
              .header p { margin: 5px 0 0 0; font-size: 12px; color: #64748b; font-weight: bold; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; font-size: 13px; }
              .title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { background-color: #f8fafc; color: #475569; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
              td { border: 1px solid #e2e8f0; padding: 12px 10px; font-size: 12px; }
              .total-row { font-weight: bold; background-color: #f1f5f9; }
              .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; font-size: 12px; }
              .sig-box { border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; height: 80px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // --- IMPRESSION DU REÇU DE PAIEMENT ---
  const triggerPrintReceipt = () => {
    const printContent = document.getElementById("printable-receipt-area");
    if (!printContent) return;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime().toString();
    const printWindow = window.open(windowUrl, uniqueName, "left=50,top=50,width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reçu de Paiement Client - STOP PALUDISME</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
              .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #059669; padding-bottom: 15px; }
              .header h1 { color: #059669; margin: 0 0 5px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
              .header h2 { color: #0d9488; margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
              .header p { margin: 3px 0; font-size: 11px; color: #475569; font-weight: 600; }
              .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px; background: #f8fafc; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 12px; }
              .details p { margin: 4px 0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
              td { border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; }
              .total-row { font-weight: bold; background-color: #f8fafc; }
              .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; font-size: 11px; }
              .sig-box { border-top: 1px dashed #94a3b8; padding-top: 8px; text-align: center; height: 70px; }
            </style>
          </head>
          <body>
            \${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // --- IMPRESSION DE LA FICHE DE PROTOCOLE ---
  const triggerPrintProtocol = () => {
    const printContent = document.getElementById("printable-protocol-fiche") || document.getElementById("printable-protocol-area");
    if (!printContent) return;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime().toString();
    const printWindow = window.open(windowUrl, uniqueName, "left=50,top=50,width=850,height=700");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fiche de Protocole de Distribution - STOP PALUDISME</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
              .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #059669; padding-bottom: 15px; }
              .header h1 { color: #059669; margin: 0 0 5px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
              .header h2 { color: #0d9488; margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
              .header p { margin: 3px 0; font-size: 11px; color: #475569; font-weight: 600; }
              .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px; background: #f8fafc; }
              .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 12px; }
              .details p { margin: 4px 0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
              td { border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; }
              .total-row { font-weight: bold; background-color: #f8fafc; }
              .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; font-size: 11px; }
              .sig-box { border-top: 1px dashed #94a3b8; padding-top: 8px; text-align: center; height: 70px; }
            </style>
          </head>
          <body>
            \${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Helper functions for modal actions
  const handleClose = () => {
    setSelectedProtocolForFiche(null);
    setSelectedVenteForReceipt(null);
    setActiveFacture(null);
  };

  const closeModal = handleClose;

  const handlePrint = () => {
    window.print();
  };

  // --- FILTRAGE DES VENTES POUR L'AFFICHAGE ---
  const filteredVentes = useMemo(() => {
    return ventes.filter(v => {
      const queryMatch = v.client_nom.toLowerCase().includes(searchQuery.toLowerCase()) || v.agent_nom.toLowerCase().includes(searchQuery.toLowerCase());
      const quartierMatch = filterQuartier === "" || v.quartier.toLowerCase() === filterQuartier.toLowerCase();
      return queryMatch && quartierMatch;
    });
  }, [ventes, searchQuery, filterQuartier]);

  // --- CALCULE DES ALERTES D'ÉCHÉANCE PROTOCOLES (ADMIN) ---
  const protocolEcheanceAlerts = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return protocoles.filter(p => {
      if (p.statut_paiement === "total") return false;
      if (!p.date_echeance) return false;
      const due = new Date(p.date_echeance);
      const curr = new Date(todayStr);
      due.setHours(0,0,0,0);
      curr.setHours(0,0,0,0);
      const diffTime = due.getTime() - curr.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 5;
    });
  }, [protocoles]);

  // --- LIVE LOGGED-IN USER INFO & COMMISSION RATE ---
  const currentUserLive = useMemo(() => {
    if (!user) return null;
    return allUsers.find(u => u.id === user.id) || user;
  }, [allUsers, user]);

  const currentCommissionRate = useMemo(() => {
    if (!currentUserLive) return 15;
    return currentUserLive.commission_rate ?? (currentUserLive.role === "distributeur" ? 20 : 15);
  }, [currentUserLive]);

  // --- NOTIFICATIONS DYNAMIQUES & CONTEXTUELLES ---
  const notifications = useMemo(() => {
    if (!user) return { count: 0, items: [] };
    const items: any[] = [];

    // 1. Messages internes issus de la table notifications dans Supabase
    dbNotifications.forEach(n => {
      items.push({
        id: n.id,
        title: `📢 ${n.titre}`,
        desc: n.message,
        type: "internal_message",
        date: n.created_at ? n.created_at.substring(0, 16).replace("T", " ") : "Récemment",
        author: n.auteur_nom,
        isDbNotif: true,
        lu: n.lu
      });
    });

    if (user.role === "stock_caissier") {
      produits.forEach(p => {
        if (p.stock < 100) {
          items.push({
            id: `low-stock-${p.id}`,
            title: `⚠️ Stock Faible Central`,
            desc: `${p.nom} ne contient plus que ${p.stock} PCS.`,
            type: "approvisionnement_alerte",
            date: "Alerte active",
            productId: p.id,
            lu: false
          });
        }
      });
      reassorts.filter(r => r.statut === "en_attente").forEach(r => {
        items.push({
          id: `reassort-${r.id}`,
          title: `📦 Demande de Réassort`,
          desc: `${r.agent_nom} sollicite ${r.quantite} PCS de ${r.produit_nom}.`,
          type: "reassort_demande",
          date: r.date_creation,
          lu: false
        });
      });
    } else if (user.role === "admin") {
      auditLogs.slice(0, 5).forEach(log => {
        items.push({
          id: `audit-${log.id}`,
          title: `🛡️ Audit: ${log.action}`,
          desc: log.details,
          type: "audit_log",
          date: log.date,
          lu: true
        });
      });
      ventes.slice(0, 3).forEach(v => {
        items.push({
          id: `vente-${v.id}`,
          title: `💰 Nouvelle Vente`,
          desc: `Vente de ${v.montant_total} ${v.devise} par ${v.agent_nom || "un agent"}.`,
          type: "vente_alerte",
          date: v.date_vente,
          lu: true
        });
      });
    } else {
      reassorts.filter(r => r.agent_id === user.id && r.statut === "valide").slice(0, 3).forEach(r => {
        items.push({
          id: `approved-reassort-${r.id}`,
          title: `✅ Réassort Validé`,
          desc: `Votre demande de ${r.quantite} PCS pour ${r.produit_nom} a été livrée !`,
          type: "reassort_valide",
          date: r.date_creation,
          productId: r.produit_id,
          lu: false
        });
      });
      agentStocks.filter(s => s.agent_id === user.id && s.stock < 10).forEach(s => {
        const prod = produits.find(p => p.id === s.produit_id);
        items.push({
          id: `low-personal-${s.id}`,
          title: `⚠️ Votre Stock est Faible`,
          desc: `Il ne vous reste que ${s.stock} PCS de ${prod ? prod.nom : "produit"}.`,
          type: "stock_perso_faible",
          date: "Alerte active",
          productId: s.produit_id,
          lu: false
        });
      });
    }

    const unreadCount = items.filter(i => !i.lu).length;

    return {
      count: unreadCount,
      items
    };
  }, [user, reassorts, produits, auditLogs, ventes, agentStocks, dbNotifications]);

  // --- CALCULE COMPENSATIONS POUR L'AGENT CONNECTÉ ---
  const compensationAgent = useMemo(() => {
    if (!user) return { fixe: 0, commUSD: 0, commCDF: 0, totalUSD: 0 };
    const matches = ventes.filter(v => v.agent_id === user.id && v.statut_paiement === "valide");
    const isVendeur = user.role === "vendeur";
    const fixe = isVendeur ? 40 : 0;
    const commUSD = matches.reduce((acc, v) => acc + (v.commission_montant || 0), 0);
    const commCDF = matches.reduce((acc, v) => acc + (v.commission_montant_cdf || 0), 0);
    return {
      fixe,
      commUSD: parseFloat(commUSD.toFixed(2)),
      commCDF,
      totalUSD: parseFloat((fixe + commUSD + (commCDF / exchangeRate)).toFixed(2))
    };
  }, [ventes, user, exchangeRate]);

  // --- RECONSTRUCTION INTERFACE DE BASE (LOGIN / INSCRIPTION / MOT DE PASSE OUBLIÉ) ---
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 text-slate-900 relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex p-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm mb-4">
            <Activity className="h-10 w-10 text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase">STOP PALUDISME</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Système National de Gestion Intégrée des Stocks et de la Force de Vente</p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="py-7 px-5 border shadow-xl rounded-2xl sm:px-8 bg-white border-slate-100">
            
            {/* ONGLETS CONNEXION / INSCRIPTION */}
            <div className="flex border-b border-slate-150 pb-3 mb-5 gap-2">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setLoginError(""); setRegError(""); setRegSuccess(""); }}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "login"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100:bg-slate-800"
                }`}
              >
                <LogIn size={13} />
                <span>Se connecter</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setLoginError(""); setRegError(""); setRegSuccess(""); }}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "register"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100:bg-slate-800"
                }`}
              >
                <UserPlus size={13} />
                <span>S'inscrire</span>
              </button>
            </div>

            {/* MESSAGES D'ALERTE */}
            {loginError && authMode === "login" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-semibold animate-shake">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
                <span>{loginError}</span>
              </div>
            )}

            {regError && authMode === "register" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-semibold animate-shake">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && authMode === "register" && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <div className="space-y-1">
                  <p>{regSuccess}</p>
                  <button
                    onClick={() => { setAuthMode("login"); setRegSuccess(""); }}
                    className="text-[11px] underline font-bold hover:text-emerald-900:text-emerald-100 block pt-1"
                  >
                    Aller à l'écran de connexion &rarr;
                  </button>
                </div>
              </div>
            )}

            {forgotError && authMode === "forgot" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-semibold">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && authMode === "forgot" && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* VUE 1 : CONNEXION */}
            {authMode === "login" && (
              <div className="space-y-4">
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div>
                    <label className={STYLES.label}>Identifiant (Email ou Téléphone)</label>
                    <input
                      type="text"
                      required
                      placeholder="nom@stoppaludisme.cd ou +243..."
                      className={STYLES.input}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={STYLES.label}>Mot de passe</label>
                      <button
                        type="button"
                        onClick={() => { setAuthMode("forgot"); setForgotError(""); setForgotSuccess(""); }}
                        className="text-[10px] text-emerald-600 hover:underline font-bold"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className={STYLES.input}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loginLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    <span>Se connecter</span>
                  </button>
                </form>

                {/* SÉPARATEUR */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold">
                    <span className="px-2 bg-white text-slate-400">
                      ou continuer avec
                    </span>
                  </div>
                </div>

                {/* BOUTON GOOGLE LOGIN FONCTIONNEL */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full py-2.5 px-4 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-sm/40 bg-white border-slate-250 hover:bg-slate-50 text-slate-750 hover:border-slate-350"
                >
                  {googleLoading ? (
                    <Loader2 size={15} className="animate-spin text-emerald-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  )}
                  <span>Connexion avec Google</span>
                </button>

                {/* COMPTES DE TEST RAPIDE */}
                <div className="mt-5 pt-4 border-t border-slate-150">
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider mb-2.5">Comptes de test rapide</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setLoginEmail("admin@stoppaludisme.cd"); setLoginPassword("admin"); }}
                      className="p-2 border border-slate-200 hover:border-emerald-300:border-emerald-600 rounded-lg text-left text-[10px] bg-slate-50 transition-all font-medium"
                    >
                      <p className="font-bold text-slate-800">Admin</p>
                      <p className="text-slate-500">admin@stoppaludisme.cd</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginEmail("vendeur@stoppaludisme.cd"); setLoginPassword("vendeur"); }}
                      className="p-2 border border-slate-200 hover:border-emerald-300:border-emerald-600 rounded-lg text-left text-[10px] bg-slate-50 transition-all font-medium"
                    >
                      <p className="font-bold text-slate-800">Vendeur</p>
                      <p className="text-slate-500">vendeur@stoppaludisme.cd</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginEmail("distributeur@stoppaludisme.cd"); setLoginPassword("distributeur"); }}
                      className="p-2 border border-slate-200 hover:border-emerald-300:border-emerald-600 rounded-lg text-left text-[10px] bg-slate-50 transition-all font-medium"
                    >
                      <p className="font-bold text-slate-800">Distributeur</p>
                      <p className="text-slate-500">distributeur@stoppaludisme.cd</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginEmail("caissier@stoppaludisme.cd"); setLoginPassword("caissier"); }}
                      className="p-2 border border-slate-200 hover:border-emerald-300:border-emerald-600 rounded-lg text-left text-[10px] bg-slate-50 transition-all font-medium"
                    >
                      <p className="font-bold text-slate-800">Stock & Caisse</p>
                      <p className="text-slate-500">caissier@stoppaludisme.cd</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VUE 2 : INSCRIPTION */}
            {authMode === "register" && (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div>
                  <label className={STYLES.label}>Nom complet</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Patient Murhula"
                    className={STYLES.input}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>

                {/* SÉLECTION TYPE INSCRIPTION : EMAIL OU TÉLÉPHONE */}
                <div>
                  <label className={STYLES.label}>Méthode de contact</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setRegType("email")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        regType === "email"
                          ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      ✉️ Par Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegType("phone")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        regType === "phone"
                          ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      📱 Par Téléphone
                    </button>
                  </div>

                  {regType === "email" ? (
                    <input
                      type="email"
                      required
                      placeholder="nom@exemple.com"
                      className={STYLES.input}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className={`w-32 ${STYLES.input}`}
                        value={regCountryCode}
                        onChange={(e) => setRegCountryCode(e.target.value)}
                      >
                        <option value="+243">🇨🇩 +243 (RDC)</option>
                        <option value="+250">🇷🇼 +250 (Rwanda)</option>
                        <option value="+257">🇧🇮 +257 (Burundi)</option>
                        <option value="+256">🇺🇬 +256 (Ouganda)</option>
                        <option value="+242">🇨🇬 +242 (Congo)</option>
                        <option value="+254">🇰🇪 +254 (Kenya)</option>
                        <option value="+255">🇹🇿 +255 (Tanzanie)</option>
                        <option value="+33">🇫🇷 +33 (France)</option>
                        <option value="+32">🇧🇪 +32 (Belgique)</option>
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="999 073 461"
                        className={STYLES.input}
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className={STYLES.label}>Mot de passe (min. 6 caractères)</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className={STYLES.input}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className={STYLES.label}>Confirmez le mot de passe</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className={STYLES.input}
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  />
                </div>

                {/* BANNIÈRE EXPLICATIVE DU WORKFLOW VALIDATION ADMIN */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⏳</span> Validation requise par l'Administrateur
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium">
                    Toute nouvelle inscription est créée avec le statut <strong>"En attente"</strong>. Vous aurez accès dès que la direction aura approuvé votre demande et configuré votre rôle.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {regLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  <span>Créer ma demande d'accès</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("login"); setRegError(""); }}
                    className="text-xs text-emerald-600 hover:underline font-bold"
                  >
                    Déjà inscrit ? Se connecter &rarr;
                  </button>
                </div>
              </form>
            )}

            {/* VUE 3 : MOT DE PASSE OUBLIÉ */}
            {authMode === "forgot" && (
              <form className="space-y-4" onSubmit={handleForgotPassword}>
                <div className="text-center pb-2">
                  <div className="inline-flex p-2.5 bg-emerald-50 rounded-full text-emerald-600 mb-2">
                    <KeyRound size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Réinitialiser le mot de passe</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Saisissez votre adresse email associée à votre compte. Un lien de réinitialisation sécurisé vous sera envoyé.
                  </p>
                </div>

                <div>
                  <label className={STYLES.label}>Email du compte</label>
                  <input
                    type="email"
                    required
                    placeholder="nom@stoppaludisme.cd"
                    className={STYLES.input}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  <span>Envoyer le lien de réinitialisation</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("login"); setForgotError(""); setForgotSuccess(""); }}
                    className="text-xs text-slate-600 hover:underline font-bold"
                  >
                    &larr; Retour à la connexion
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-slate-50 text-slate-800">
      {/* FLOATING TOASTS CONTAINER */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all duration-300 ${
              t.type === "success"
                ? "bg-emerald-550 bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100"
                : t.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100"
                : "bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100"
            }`}
          >
            {t.type === "success" ? (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">✓</span>
            ) : t.type === "error" ? (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">✗</span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0">i</span>
            )}
            <p className="text-xs font-bold leading-tight">{t.message}</p>
          </div>
        ))}
      </div>

      {/* MODAL DETAIL DE TRANSFERT VENDEUR */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 relative">
            <button
              onClick={() => setSelectedLogDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                <Check size={20} />
              </span>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Détails du Transfert de Stock</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Réf: {selectedLogDetail.log.id}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date & Heure de Réception</p>
                  <p className="font-extrabold text-slate-800 mt-1">{selectedLogDetail.log.date}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expéditeur / Origine</p>
                  <p className="font-extrabold text-slate-800 mt-1">{selectedLogDetail.log.auteur || "Stock & Caisse"}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Article / Kit Reçu</p>
                <p className="font-black text-emerald-800 text-sm mt-1">{selectedLogDetail.productName}</p>
                {selectedLogDetail.prod?.description && (
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{selectedLogDetail.prod.description}</p>
                )}
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quantité Livrée</p>
                  <p className="font-extrabold text-emerald-700 text-sm mt-0.5">+{selectedLogDetail.qty} PCS</p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 bg-emerald-600 text-white rounded-lg">
                  Livré avec succès
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Suivi de l'Inventaire Personnel</p>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                  <span className="text-slate-500">Stock terrain avant :</span>
                  <span className="font-bold text-slate-600">
                    {Math.max(0, (agentStocks.find(s => s.produit_id === selectedLogDetail.prod?.id && s.agent_id === user?.id)?.stock || 0) - selectedLogDetail.qty)} PCS
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-500">Stock terrain après :</span>
                  <span className="font-extrabold text-emerald-600">
                    {agentStocks.find(s => s.produit_id === selectedLogDetail.prod?.id && s.agent_id === user?.id)?.stock || 0} PCS
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedLogDetail(null)}
              className="w-full mt-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              Fermer les détails
            </button>
          </div>
        </div>
      )}

      {/* HEADER BANNER GENERAL */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-sm/50 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-sm">
                <Activity size={18} />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">STOP PALUDISME</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plateforme d'Indicateurs et de Gestion de la Santé</p>
              </div>
            </div>
          </div>

          {/* BANNER DU TAUX GLOBAL POUR TOUS LES UTILISATEURS */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 justify-end">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm/30">
              <TrendingUp className="text-emerald-600 shrink-0" size={14} />
              <span className="text-[11px] font-bold text-slate-600 uppercase">Taux du jour :</span>
              <span className="text-xs font-black text-emerald-800">1 USD = {exchangeRate} CDF</span>
              {user.role === "admin" && (
                <form onSubmit={handleUpdateRate} className="flex items-center gap-1 ml-2 pl-2 border-l border-emerald-200">
                  <input
                    type="number"
                    value={rateEditVal}
                    onChange={(e) => setRateEditVal(e.target.value)}
                    className="w-16 px-1 py-0.5 text-[10px] border border-emerald-300 rounded text-center bg-white text-slate-900"
                  />
                  <button type="submit" disabled={rateLoading} className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded">
                    <Check size={8} />
                  </button>
                </form>
              )}
            </div>

            {/* NOTIFICATION ICON WITH CONTEXTUAL ALERTS */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2 rounded-xl border transition-all flex items-center justify-center hover:bg-slate-50:bg-slate-800 ${showNotifDropdown ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-slate-150 text-slate-500"}`}
                title={user.role === "stock_caissier" ? "Alertes d'Approvisionnement" : "Notifications"}
              >
                <Bell size={16} />
                {notifications.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center border border-white">
                    {notifications.count}
                  </span>
                )}
              </button>

              {/* DROPDOWN MENU */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      {user.role === "stock_caissier" ? "🔔 Alertes Approvisionnement" : "🔔 Vos Notifications"}
                    </h4>
                    {notifications.count > 0 && (
                      <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md">
                        {notifications.count} Active(s)
                      </span>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 px-2 mt-1">
                    {notifications.items.length === 0 ? (
                       <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        Aucune notification pour le moment.
                      </div>
                    ) : (
                      notifications.items.map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setShowNotifDropdown(false);
                            if (item.productId) {
                              setHighlightedProductId(item.productId);
                              if (user.role === "stock_caissier") {
                                setActiveTab("magasin_central");
                              } else {
                                setActiveTab("mon_stock");
                              }
                              setTimeout(() => {
                                setHighlightedProductId(null);
                              }, 4000);
                            } else if (item.type === "reassort_demande") {
                              setActiveTab("reassorts_validation");
                            } else if (user.role === "admin") {
                              setActiveTab("dashboard");
                            } else if (user.role === "stock_caissier") {
                              setActiveTab("magasin_central");
                            } else {
                              setActiveTab("mon_stock");
                            }
                          }}
                          className="w-full p-2.5 hover:bg-slate-50:bg-slate-800 rounded-lg transition-colors text-left block cursor-pointer border-l-2 border-transparent hover:border-emerald-500"
                        >
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 font-medium">{item.desc}</p>
                          <p className="text-[8px] text-slate-400 mt-1.5 text-right font-semibold">{item.date}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DETAILS UTILISATEUR CONNECTÉ */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wider ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{user.name}</p>
                <p className="text-[9px] text-slate-400 font-semibold">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50:bg-red-950/40 transition-colors ml-1"
                title="Se déconnecter"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CORE NAVIGATION DE L'APPLICATION SELON LE RÔLE */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* SIDEBAR NAVIGATION BAR */}
        <aside className="w-full md:w-56 shrink-0">
          <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-sm/30 sticky top-20 flex flex-row md:flex-col overflow-x-auto gap-1 transition-colors">
            {user.role === "admin" && (
              <>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "dashboard" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <TrendingUp size={14} /> Cockpit Global
                </button>
                <button
                  onClick={() => setActiveTab("catalogue")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "catalogue" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <ShoppingBag size={14} /> Catalogue & Stocks
                </button>
                <button
                  onClick={() => setActiveTab("protocoles_validation")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "protocoles_validation" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <ClipboardList size={14} /> Validation Protocoles
                </button>
                <button
                  onClick={() => setActiveTab("paies_admin")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "paies_admin" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <FileSpreadsheet size={14} /> Fiches de Paie
                </button>
                <button
                  onClick={() => setActiveTab("utilisateurs")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "utilisateurs" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Users size={14} /> Utilisateurs (Roles)
                </button>
                <button
                  onClick={() => setActiveTab("tous_clients")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "tous_clients" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Users size={14} /> Tous les Clients
                </button>
                <button
                  onClick={() => setActiveTab("historique_general")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "historique_general" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <span>📜</span> Historique Général & Transactions
                </button>
              </>
            )}

            {user.role === "vendeur" && (
              <>
                <button
                  onClick={() => setActiveTab("ventes")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "ventes" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <ShoppingBag size={14} /> Nouvelle Vente
                </button>
                <button
                  onClick={() => setActiveTab("protocoles_vendeur")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "protocoles_vendeur" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Building size={14} /> Protocole d'Entreprise
                </button>
                <button
                  onClick={() => setActiveTab("mon_stock")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "mon_stock" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Package size={14} /> Mon Stock & Réassort
                </button>
                <button
                  onClick={() => setActiveTab("mon_solde")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "mon_solde" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Coins size={14} /> Mon Solde ($40 + {currentCommissionRate}%)
                </button>
              </>
            )}

            {user.role === "distributeur" && (
              <>
                <button
                  onClick={() => setActiveTab("ventes")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "ventes" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <ShoppingBag size={14} /> Ventes Point Fixe
                </button>
                <button
                  onClick={() => setActiveTab("mon_stock")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "mon_stock" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Package size={14} /> Stock Dépôt & Réassort
                </button>
                <button
                  onClick={() => setActiveTab("mon_solde")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "mon_solde" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Coins size={14} /> Mon Solde (0$ + {currentCommissionRate}%)
                </button>
              </>
            )}

            {user.role === "stock_caissier" && (
              <>
                <div className="px-3 py-1 text-[9px] font-bold uppercase text-slate-400 tracking-wider">Logistique</div>
                <button
                  onClick={() => setActiveTab("magasin_central")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "magasin_central" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Building size={14} /> Magasin Central
                </button>
                <button
                  onClick={() => setActiveTab("reassorts_validation")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "reassorts_validation" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <ClipboardList size={14} /> Demandes Réassort
                </button>

                <div className="px-3 py-1 text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-2">Finance & Caisse</div>
                <button
                  onClick={() => setActiveTab("validation_reglements")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "validation_reglements" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <CheckCircle2 size={14} /> Valider Règlements
                </button>
                <button
                  onClick={() => setActiveTab("validation_paies")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "validation_paies" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50:bg-slate-800"}`}
                >
                  <Coins size={14} /> Valider Paies & Commissions
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab("parametres")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "parametres" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Settings size={14} /> Paramètres & Profil
            </button>
            <button
              onClick={loadAllData}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-2 shrink-0 md:mt-2"
            >
              <RefreshCw size={13} className={loadingData ? "animate-spin text-emerald-600" : ""} />
              {loadingData ? "Sync en cours..." : "Actualiser"}
            </button>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL DE L'APPLICATION */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          {/* TAB COCKPIT GLOBAL (ADMIN) */}
          {activeTab === "dashboard" && user.role === "admin" && (
            <div className="space-y-6">
              {/* COMPOSANT ALERTE DE PAIEMENT PROTOCOLE J-5 */}
              {protocolEcheanceAlerts.length > 0 && (
                <div className="space-y-3">
                  {protocolEcheanceAlerts.map(p => {
                    const remainingDays = (() => {
                      if (!p.date_echeance) return 5;
                      const due = new Date(p.date_echeance);
                      const curr = new Date(new Date().toISOString().split("T")[0]);
                      due.setHours(0,0,0,0);
                      curr.setHours(0,0,0,0);
                      const diffDays = Math.ceil((due.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays;
                    })();
                    return (
                      <div key={p.id} className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm animate-pulse">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                          <div>
                            <h4 className="text-xs font-black text-amber-900 uppercase">Échéance Proche (J-{remainingDays})</h4>
                            <p className="text-xs font-bold text-amber-700 mt-1">
                              Attention : Il ne reste que {remainingDays} jours pour le paiement du protocole {p.institution} !
                            </p>
                            <p className="text-[10px] font-semibold text-amber-500 mt-1">
                              Dette restante : {(p.montant_du_usd - p.montant_paye_usd).toFixed(2)} USD / {(p.montant_du_cdf - p.montant_paye_cdf).toLocaleString()} CDF
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab("protocoles_validation");
                            setSelectedProtocolId(p.id);
                          }}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm self-start sm:self-auto shrink-0"
                        >
                          Gérer le règlement
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CARTES KPI ALIGNÉES DIRECTEMENT AVEC LA REQUÊTE UTILISATEUR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={STYLES.card}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chiffre d'Affaires global</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {stats ? stats.chiffre_affaires.toFixed(2) : "0.00"} USD
                      </h3>
                      <p className="text-[9px] font-bold text-emerald-600 mt-2">
                        ≈ {stats ? Math.round(stats.chiffre_affaires * exchangeRate).toLocaleString() : "0"} CDF
                      </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                      <TrendingUp size={16} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>Cash: {stats ? stats.total_ventes_cash : "0"} USD</span>
                    <span>Crédit: {stats ? stats.total_ventes_credit : "0"} USD</span>
                  </div>
                </div>

                <div className={STYLES.card}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Commissions Agents</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {stats ? stats.total_commissions.toFixed(2) : "0.00"} USD
                      </h3>
                      <p className="text-[9px] font-bold text-emerald-600 mt-2">
                        ≈ {stats ? Math.round(stats.total_commissions * exchangeRate).toLocaleString() : "0"} CDF
                      </p>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                      <Coins size={16} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-500 font-bold text-center">
                    Enregistrements sur ventes directes
                  </div>
                </div>

                <div className={STYLES.card}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Foyers Protégés (Bukavu)</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {clients.length} Foyers
                      </h3>
                      <p className="text-[9px] font-semibold text-emerald-600 mt-2">
                        Protection efficace de moustiquaires
                      </p>
                    </div>
                    <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                      <Users size={16} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-500 font-bold flex justify-between">
                    <span>Panzi: {clients.filter(c => c.quartier === "Panzi").length}</span>
                    <span>Kadutu: {clients.filter(c => c.quartier === "Kadutu").length}</span>
                    <span>Ibanda: {clients.filter(c => c.quartier === "Ibanda").length}</span>
                  </div>
                </div>

                <div className={STYLES.card}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demandes Réassort encours</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1">
                        {reassorts.filter(r => r.statut === "en_attente").length} Demandes
                      </h3>
                      <p className="text-[9px] font-bold text-amber-600 mt-2">
                        Validation requise magasinier
                      </p>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                      <Package size={16} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-500 font-bold text-center">
                    Garantie d'absence de rupture de stock
                  </div>
                </div>
              </div>

              {/* GRAPHIQUE/RÉPARTITION DE PROTECTION ET CA PAR QUARTIER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${STYLES.card} lg:col-span-2`}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Couverture Malaria par Quartier de Bukavu</h3>
                  <div className="space-y-4">
                    {["Panzi", "Kadutu", "Ibanda"].map(q => {
                      const qtyVentes = ventes.filter(v => v.quartier.toLowerCase() === q.toLowerCase()).length;
                      const sizeClients = clients.filter(c => c.quartier.toLowerCase() === q.toLowerCase()).length;
                      const caTot = ventes.filter(v => v.quartier.toLowerCase() === q.toLowerCase()).reduce((acc, v) => acc + v.total, 0);

                      return (
                        <div key={q} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-black text-slate-800">{q}</span>
                            <span className="text-xs font-bold text-slate-500">{sizeClients} Foyers protégés</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${Math.min(100, (sizeClients / 10) * 100)}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
                            <span>{qtyVentes} Commandes enregistrées</span>
                            <span className="text-emerald-700">{caTot.toFixed(2)} USD Chiffre d'Affaires</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Caisses par Type de Paiement</h3>
                  <div className="space-y-4">
                    {Object.entries(PAYMENT_MODE_LABELS).map(([mode, label]) => {
                      const modeVentes = ventes.filter(v => v.type_paiement === mode && v.statut_paiement === "valide");
                      const modeTotal = modeVentes.reduce((acc, v) => acc + v.total, 0);
                      return (
                        <div key={mode} className="flex items-center justify-between p-2.5 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{label}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{modeVentes.length} Validations confirmées</p>
                          </div>
                          <span className="text-xs font-black text-slate-700">{modeTotal.toFixed(2)} $</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* HISTORIQUE DE TOUTES LES VENTES SANS FILTRE */}
              <div className={STYLES.card}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Journal de Vente Global</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Rechercher client, agent..."
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                      value={filterQuartier}
                      onChange={(e) => setFilterQuartier(e.target.value)}
                    >
                      <option value="">Tous les Quartiers</option>
                      <option value="Panzi">Panzi</option>
                      <option value="Kadutu">Kadutu</option>
                      <option value="Ibanda">Ibanda</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Date</th>
                        <th className={STYLES.tableTh}>Client</th>
                        <th className={STYLES.tableTh}>Quartier</th>
                        <th className={STYLES.tableTh}>Agent</th>
                        <th className={STYLES.tableTh}>Montant</th>
                        <th className={STYLES.tableTh}>Type Paiement</th>
                        <th className={STYLES.tableTh}>Statut Caisse</th>
                        <th className={STYLES.tableTh}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVentes.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className={STYLES.tableTd}>{v.date_vente}</td>
                          <td className={`${STYLES.tableTd} font-bold`}>{v.client_nom}</td>
                          <td className={STYLES.tableTd}>{v.quartier}</td>
                          <td className={STYLES.tableTd}>{v.agent_nom}</td>
                          <td className={`${STYLES.tableTd} font-bold`}>
                            {v.total.toFixed(2)} USD <span className="text-slate-400">/ {v.total_cdf?.toLocaleString() || Math.round(v.total * exchangeRate).toLocaleString()} CDF</span>
                          </td>
                          <td className={`${STYLES.tableTd} font-semibold uppercase`}>{v.type_paiement}</td>
                          <td className={STYLES.tableTd}>
                            <span className={v.statut_paiement === "valide" ? STYLES.badgeSuccess : STYLES.badgePending}>
                              {v.statut_paiement === "valide" ? "Validé" : "En attente"}
                            </span>
                          </td>
                          <td className={STYLES.tableTd}>
                            <button
                              onClick={() => setSelectedVenteForReceipt(v)}
                              className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1"
                            >
                              🧾 Reçu
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB ENREGISTRER VENTE (VENDEUR / DISTRIBUTEUR) */}
          {activeTab === "ventes" && (user.role === "vendeur" || user.role === "distributeur") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* FORMULAIRE DE VENTE DIRECTE SANS CONSERVER LES COMPOSANTS MOCK INUTILES */}
              <div className={`${STYLES.card} lg:col-span-2`}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">
                  Enregistrer une nouvelle Vente sur le terrain
                </h3>

                {venteSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-bold">
                    {venteSuccess}
                  </div>
                )}
                {venteError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
                    {venteError}
                  </div>
                )}

                <form onSubmit={handleAddVente} className="space-y-4">
                  {/* CLIENT AUTOCOMPLETION */}
                  <div className="relative">
                    <label className={STYLES.label}>Rechercher / Créer un Client</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Commencez à saisir le nom du client..."
                          className={STYLES.input}
                          value={clientSearchTerm}
                          onChange={(e) => {
                            setClientSearchTerm(e.target.value);
                            setShowClientSuggestions(true);
                          }}
                          onFocus={() => setShowClientSuggestions(true)}
                        />
                        {showClientSuggestions && filteredClientsForSearch.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto text-xs divide-y divide-slate-100">
                            {filteredClientsForSearch.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClientId(c.id);
                                  setClientSearchTerm(c.nom);
                                  setClientTel(c.telephone);
                                  setClientQuartier(c.quartier);
                                  setClientAdresse(c.adresse);
                                  setShowClientSuggestions(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium"
                              >
                                {c.nom} ({c.telephone}) - Quartier {c.quartier}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedClientId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId("");
                            setClientSearchTerm("");
                            setClientTel("");
                            setClientAdresse("");
                          }}
                          className={STYLES.btnSecondary}
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={STYLES.label}>Téléphone du client</label>
                      <input
                        type="text"
                        required
                        className={STYLES.input}
                        placeholder="+243..."
                        value={clientTel}
                        onChange={(e) => setClientTel(e.target.value)}
                        disabled={!!selectedClientId}
                      />
                    </div>
                    <div>
                      <label className={STYLES.label}>Quartier de Bukavu</label>
                      <select
                        className={STYLES.input}
                        value={clientQuartier}
                        onChange={(e) => setClientQuartier(e.target.value)}
                        disabled={!!selectedClientId}
                      >
                        <option value="Panzi">Panzi</option>
                        <option value="Kadutu">Kadutu</option>
                        <option value="Ibanda">Ibanda</option>
                      </select>
                    </div>
                    <div>
                      <label className={STYLES.label}>Avenue & N°</label>
                      <input
                        type="text"
                        className={STYLES.input}
                        placeholder="Av. du Lac, No 12"
                        value={clientAdresse}
                        onChange={(e) => setClientAdresse(e.target.value)}
                        disabled={!!selectedClientId}
                      />
                    </div>
                  </div>

                  {/* MULTI-PRODUIT : CHOIX DU PRODUIT */}
                  <div>
                    <label className={STYLES.label}>Produits & Quantités</label>
                    {venteProduits.map((vp, index) => (
                      <div key={index} className="flex gap-2 items-center w-full mb-2">
                        <select
                          required
                          className="flex-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          value={vp.produit_id}
                          onChange={(e) => {
                            const newVp = [...venteProduits];
                            newVp[index].produit_id = e.target.value;
                            newVp[index].quantite = 1;
                            setVenteProduits(newVp);
                          }}
                        >
                          <option value="">-- Choisir un article / kit --</option>
                          {produits.map(p => (
                            <option key={p.id} value={p.id} className="text-slate-800">
                              {p.nom} ({p.prix} {p.devise || "USD"})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-20 p-2.5 border border-slate-300 rounded-xl text-center font-black text-slate-800 bg-white"
                          value={vp.quantite || 1}
                          onChange={(e) => {
                            const newVp = [...venteProduits];
                            newVp[index].quantite = parseInt(e.target.value) || 1;
                            setVenteProduits(newVp);
                          }}
                        />
                        {venteProduits.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setVenteProduits(venteProduits.filter((_, i) => i !== index))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    {venteProduits.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setVenteProduits([...venteProduits, { produit_id: "", quantite: 1 }])}
                        className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-1"
                      >
                        <Plus size={12} /> Ajouter un autre produit
                      </button>
                    )}
                  </div>

                  {/* MODE DE REGLEMENT DU CAISSIER */}
                  <div>
                    <label className={STYLES.label}>Mode de Règlement à Valider</label>
                    <select
                      className={STYLES.input}
                      value={typePaiement}
                      onChange={(e) => setTypePaiement(e.target.value as Vente["type_paiement"])}
                    >
                      <option value="cash">Espèces / Cash</option>
                      <option value="credit">Crédit Client</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="airtel_money">Airtel Money</option>
                      <option value="orange_money">Orange Money</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={venteLoading}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                  >
                    {venteLoading ? "Validation..." : "Enregistrer la vente"}
                  </button>
                </form>
              </div>

              {/* SOMMAIRE DU CHOC DES REVENUS ET COMMISSIONS DE L'AGENT CONNECTÉ */}
              <div className="space-y-6">
                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Mon Solde Actuel ({currentUserLive?.role === "vendeur" ? "$40 + " : "0$ + "}{currentCommissionRate}%)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-xs font-bold text-slate-500">Salaire Fixe mensuel :</span>
                      <span className="text-xs font-black text-slate-700">{compensationAgent.fixe} $</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-xs font-bold text-slate-500">Commissions cumulées ({currentCommissionRate}%) :</span>
                      <span className="text-xs font-black text-slate-700">{compensationAgent.commUSD} $</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-xs font-bold text-slate-500">Commissions CDF cumulées :</span>
                      <span className="text-xs font-black text-emerald-700">{compensationAgent.commCDF.toLocaleString()} CDF</span>
                    </div>
                    <div className="pt-3 border-t border-slate-150 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800">Total estimé (USD) :</span>
                      <span className="text-sm font-black text-emerald-600">{compensationAgent.totalUSD} $</span>
                    </div>
                  </div>
                </div>

                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Mes ventes récentes & Dossiers</h3>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                    {combinedRecentItems.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Aucun enregistrement pour le moment.</p>
                    ) : (
                      combinedRecentItems.map(item => {
                        if (item.type === "protocole") {
                          return (
                            <button
                              key={`p-${item.id}`}
                              type="button"
                              onClick={() => setSelectedSellerProtocol(item.rawItem)}
                              className="w-full py-2.5 flex justify-between items-center text-xs text-left cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors border-l-2 border-amber-400 pl-3"
                            >
                              <div className="flex items-center gap-2">
                                <FolderOpen className="text-amber-500 shrink-0" size={16} />
                                <div>
                                  <p className="font-extrabold text-slate-800">{item.title}</p>
                                  <p className="text-[10px] text-slate-400">Dossier Protocole &middot; {item.subtitle}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-slate-700">{item.amountUSD.toFixed(2)} $</p>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${item.badgeColor}`}>
                                  {item.badgeText}
                                </span>
                              </div>
                            </button>
                          );
                        } else {
                          return (
                            <div key={`v-${item.id}`} className="py-2.5 flex justify-between items-center text-xs px-2">
                              <div>
                                <p className="font-bold text-slate-800">{item.title}</p>
                                <p className="text-[10px] text-slate-400">{item.date} &middot; {item.subtitle}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-slate-700">{item.amountUSD.toFixed(2)} $</p>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${item.badgeColor}`}>
                                  {item.badgeText}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB MON SOLDE (VENDEUR / DISTRIBUTEUR) */}
          {activeTab === "mon_solde" && (user.role === "vendeur" || user.role === "distributeur") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD SOLDE ACTUEL */}
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider flex items-center gap-2">
                  <Coins size={16} className="text-emerald-600" /> Mon Solde Actuel ({user.role === "vendeur" ? "$40 + " : "0$ + "}{currentCommissionRate}%)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-xs font-bold text-slate-500">Salaire Fixe mensuel :</span>
                    <span className="text-xs font-black text-slate-700">{compensationAgent.fixe} $</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-xs font-bold text-slate-500">Commissions cumulées ({currentCommissionRate}%) :</span>
                    <span className="text-xs font-black text-slate-700">{compensationAgent.commUSD} $</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-xs font-bold text-slate-500">Commissions CDF cumulées :</span>
                    <span className="text-xs font-black text-emerald-700">{compensationAgent.commCDF.toLocaleString()} CDF</span>
                  </div>
                  <div className="pt-3 border-t border-slate-150 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800">Total estimé (USD) :</span>
                    <span className="text-sm font-black text-emerald-600">{compensationAgent.totalUSD} $</span>
                  </div>
                </div>
              </div>

              {/* CARD HISTORIQUE DES VENTES & PROTOCOLES */}
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">
                  Mes ventes récentes & Dossiers
                </h3>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
                  {combinedRecentItems.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Aucun enregistrement pour le moment.</p>
                  ) : (
                    combinedRecentItems.map(item => {
                      if (item.type === "protocole") {
                        return (
                          <button
                            key={`solde-p-${item.id}`}
                            type="button"
                            onClick={() => setSelectedSellerProtocol(item.rawItem)}
                            className="w-full py-2.5 flex justify-between items-center text-xs text-left cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors border-l-2 border-amber-400 pl-3"
                          >
                            <div className="flex items-center gap-2">
                              <FolderOpen className="text-amber-500 shrink-0" size={16} />
                              <div>
                                <p className="font-extrabold text-slate-800">{item.title}</p>
                                <p className="text-[10px] text-slate-400">Dossier Protocole &middot; {item.subtitle}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-700">{item.amountUSD.toFixed(2)} $</p>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${item.badgeColor}`}>
                                {item.badgeText}
                              </span>
                            </div>
                          </button>
                        );
                      } else {
                        return (
                          <div key={`solde-v-${item.id}`} className="py-2.5 flex justify-between items-center text-xs px-2">
                            <div>
                              <p className="font-bold text-slate-800">{item.title}</p>
                              <p className="text-[10px] text-slate-400">{item.date} &middot; {item.subtitle}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-700">{item.amountUSD.toFixed(2)} $</p>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${item.badgeColor}`}>
                                {item.badgeText}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB FORMULAIRE DE PROTOCOLE D'ENTREPRISE (VENDEUR EXCLUSIF) */}
          {activeTab === "protocoles_vendeur" && user.role === "vendeur" && (
            <div className={STYLES.card}>
              <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">
                Nouveau Protocole d'Entreprise ou d'Institution
              </h3>

              {protoSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-bold">
                  {protoSuccess}
                </div>
              )}
              {protoError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
                  {protoError}
                </div>
              )}

              <form onSubmit={handleAddProtocole} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={STYLES.label}>Institution / Entreprise</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Hôpital de Panzi, Université UOB..."
                      className={STYLES.input}
                      value={protoInstitution}
                      onChange={(e) => setProtoInstitution(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={STYLES.label}>Avenue de l'Institution</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Avenue Hôpital de Panzi"
                      className={STYLES.input}
                      value={protoAvenue}
                      onChange={(e) => setProtoAvenue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={STYLES.label}>Quartier de Bukavu</label>
                    <select
                      className={STYLES.input}
                      value={protoQuartier}
                      onChange={(e) => setProtoQuartier(e.target.value)}
                    >
                      <option value="Panzi">Panzi</option>
                      <option value="Kadutu">Kadutu</option>
                      <option value="Ibanda">Ibanda</option>
                    </select>
                  </div>
                  <div>
                    <label className={STYLES.label}>Notes ou observations</label>
                    <input
                      type="text"
                      placeholder="Ex: Distribution au personnel médical"
                      className={STYLES.input}
                      value={protoNotes}
                      onChange={(e) => setProtoNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* LISTE DES BÉNÉFICIAIRES */}
                <div>
                  <label className={STYLES.label}>Agents bénéficiaires de kits moustiquaires</label>
                  {protoBeneficiaires.map((b, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 rounded-lg bg-slate-50/50 mb-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Nom de l'agent bénéficiaire</label>
                          <input
                            type="text"
                            required
                            placeholder="Nom complet"
                            className={STYLES.input}
                            value={b.nom}
                            onChange={(e) => {
                              const newB = [...protoBeneficiaires];
                              newB[idx].nom = e.target.value;
                              setProtoBeneficiaires(newB);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Téléphone</label>
                          <input
                            type="text"
                            placeholder="Ex: +243..."
                            className={STYLES.input}
                            value={b.telephone}
                            onChange={(e) => {
                              const newB = [...protoBeneficiaires];
                              newB[idx].telephone = e.target.value;
                              setProtoBeneficiaires(newB);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Adresse à Bukavu</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Av. Kasongo No 4"
                            className={STYLES.input}
                            value={b.adresse}
                            onChange={(e) => {
                              const newB = [...protoBeneficiaires];
                              newB[idx].adresse = e.target.value;
                              setProtoBeneficiaires(newB);
                            }}
                          />
                        </div>
                      </div>

                      {/* Panier sur-mesure pour ce bénéficiaire */}
                      <div className="border-t border-slate-200/60 pt-2.5">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Panier d'articles pour {b.nom || "ce bénéficiaire"}</p>
                        {b.produits.map((prodRow, pIdx) => (
                          <div key={pIdx} className="flex gap-2 mb-2 items-center w-full">
                            <select
                              required
                              className="flex-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              value={prodRow.produit_id}
                              onChange={(e) => {
                                const newB = [...protoBeneficiaires];
                                newB[idx].produits[pIdx].produit_id = e.target.value;
                                newB[idx].produits[pIdx].quantite = 1;
                                setProtoBeneficiaires(newB);
                              }}
                            >
                              <option value="">-- Choisir un article / kit --</option>
                              {produits.map(p => (
                                <option key={p.id} value={p.id} className="text-slate-800">
                                  {p.nom} ({p.prix} {p.devise || "USD"})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              required
                              min="1"
                              className="w-20 p-2.5 border border-slate-300 rounded-xl text-center font-black text-slate-800 bg-white"
                              placeholder="Qté"
                              value={prodRow.quantite || 1}
                              onChange={(e) => {
                                const newB = [...protoBeneficiaires];
                                newB[idx].produits[pIdx].quantite = parseInt(e.target.value) || 1;
                                setProtoBeneficiaires(newB);
                              }}
                            />
                            {b.produits.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newB = [...protoBeneficiaires];
                                  newB[idx].produits = b.produits.filter((_, i) => i !== pIdx);
                                  setProtoBeneficiaires(newB);
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded shrink-0"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center justify-between mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newB = [...protoBeneficiaires];
                              newB[idx].produits.push({ produit_id: "", quantite: 1 });
                              setProtoBeneficiaires(newB);
                            }}
                            className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Plus size={11} /> Ajouter un article au panier
                          </button>
                          {protoBeneficiaires.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setProtoBeneficiaires(protoBeneficiaires.filter((_, i) => i !== idx))}
                              className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Retirer {b.nom || "ce bénéficiaire"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setProtoBeneficiaires([...protoBeneficiaires, { nom: "", telephone: "", adresse: "", produits: [{ produit_id: "", quantite: 1 }] }])}
                    className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-2"
                  >
                    <Plus size={12} /> Ajouter un autre bénéficiaire
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={protoLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  {protoLoading ? "Enregistrement..." : "Créer le Protocole d'Entreprise"}
                </button>
              </form>
            </div>
          )}

          {/* TAB MON STOCK PERSONNEL & DEMANDES RÉASSORT (VENDEUR / DISTRIBUTEUR) */}
          {activeTab === "mon_stock" && (user.role === "vendeur" || user.role === "distributeur") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* STOCKS PERSONNELS */}
              <div className={`${STYLES.card} lg:col-span-2`}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Mon Stock de terrain actuel</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {produits.map(p => {
                    const localStock = agentStocks.find(s => s.produit_id === p.id)?.stock || 0;
                    const isHighlighted = p.id === highlightedProductId;
                    return (
                      <div key={p.id} className={`p-4 border rounded-xl flex justify-between items-center transition-all duration-500 ${isHighlighted ? "bg-amber-50 border-2 border-amber-300 ring-4 ring-amber-100 animate-pulse scale-102 shadow-md" : "border-slate-100 bg-slate-50/50"}`}>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{p.nom}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-black ${isHighlighted ? "text-amber-700 font-extrabold" : localStock < 5 ? "text-red-600" : "text-emerald-600"}`}>
                            {localStock} PCS
                          </span>
                          {localStock < 5 && !isHighlighted && (
                            <p className="text-[9px] font-bold text-red-500 uppercase mt-1 tracking-wider animate-pulse">Stock Faible</p>
                          )}
                          {isHighlighted && (
                            <p className="text-[9px] font-bold text-amber-600 uppercase mt-1 tracking-wider">Cible</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* LISTE DES DEMANDES DE RÉASSORT */}
                <h3 className="text-xs font-black uppercase text-slate-700 mt-6 mb-4 tracking-wider">Suivi de mes demandes de réassort</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Date</th>
                        <th className={STYLES.tableTh}>Produit</th>
                        <th className={STYLES.tableTh}>Quantité</th>
                        <th className={STYLES.tableTh}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reassorts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">Aucun historique de demande.</td>
                        </tr>
                      ) : (
                        reassorts.map(r => (
                          <tr key={r.id}>
                            <td className={STYLES.tableTd}>{r.date_creation}</td>
                            <td className={`${STYLES.tableTd} font-bold`}>{r.produit_nom}</td>
                            <td className={STYLES.tableTd}>{r.quantite} PCS</td>
                            <td className={STYLES.tableTd}>
                              <span className={r.statut === "valide" ? STYLES.badgeSuccess : r.statut === "refuse" ? STYLES.badgeDanger : STYLES.badgePending}>
                                {r.statut === "valide" ? "Livré" : r.statut === "refuse" ? "Refusé" : "En attente"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* HISTORIQUE DES RÉCEPTIONS & LIVRAISONS DIRECTES */}
                <h3 className="text-xs font-black uppercase text-slate-700 mt-8 mb-4 tracking-wider border-t border-slate-100 pt-6">
                  Historique des Réceptions & Livraisons
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className={STYLES.tableTh}>Date & Heure</th>
                        <th className={STYLES.tableTh}>Article / Kit</th>
                        <th className={STYLES.tableTh}>Quantité</th>
                        <th className={STYLES.tableTh}>Expéditeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sellerLogs = auditLogs.filter(log => 
                          log.action === "Livraison Agent" && 
                          user && log.details.toLowerCase().includes(user.name.toLowerCase())
                        );

                        if (sellerLogs.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-400 font-medium">
                                Aucune réception de stock enregistrée.
                              </td>
                            </tr>
                          );
                        }

                        return sellerLogs.map(log => {
                          const qtyMatch = log.details.match(/de (\d+)\s*PCS/i) || log.details.match(/de (\d+)\s*pièces/i);
                          const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

                          const prod = produits.find(p => log.details.toLowerCase().includes(p.nom.toLowerCase()));
                          const productName = prod ? prod.nom : "Article / Kit";

                          return (
                            <tr 
                              key={log.id} 
                              onClick={() => setSelectedLogDetail({ log, qty, productName, prod })}
                              className="hover:bg-emerald-50/40 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                            >
                              <td className={STYLES.tableTd}>{log.date}</td>
                              <td className={`${STYLES.tableTd} font-black text-emerald-800`}>{productName}</td>
                              <td className={STYLES.tableTd}>
                                <span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  {qty} PCS
                                </span>
                              </td>
                              <td className={STYLES.tableTd}>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  {log.auteur || "Stock & Caisse"}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DEMANDE DE REASSORT RAPIDE */}
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Demander du Réassort</h3>
                <form onSubmit={handleAddReassort} className="space-y-4">
                  <div>
                    <label className={STYLES.label}>Article Central</label>
                    <select
                      required
                      className={STYLES.input}
                      value={reassortProdId}
                      onChange={(e) => setReassortProdId(e.target.value)}
                    >
                      <option value="">Sélectionnez un produit...</option>
                      {produits.map(p => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={STYLES.label}>Quantité requise</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className={STYLES.input}
                      value={reassortQty}
                      onChange={(e) => setReassortQty(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reassortLoading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                  >
                    {reassortLoading ? "Envoi..." : "Envoyer la Demande"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB MAGASIN CENTRAL & LIVRAISON RÉASSORTS (STOCK MANAGER) */}
          {activeTab === "magasin_central" && user.role === "stock_caissier" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* STOCKS DU MAGASIN CENTRAL */}
              <div className={`${STYLES.card} lg:col-span-2`}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Inventaire du Magasin Central</h3>
                <div className="divide-y divide-slate-100">
                  {produits.map(p => {
                    const isHighlighted = p.id === highlightedProductId;
                    return (
                      <div key={p.id} className={`py-3 flex justify-between items-center transition-all duration-500 px-3 rounded-xl ${isHighlighted ? "bg-amber-50 border-2 border-amber-300 ring-4 ring-amber-100 animate-pulse scale-102" : "border-b border-transparent hover:bg-slate-50/50"}`}>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{p.nom}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black px-2 py-1 rounded-lg ${isHighlighted ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"}`}>
                            {p.stock} PCS
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
 
              <div className="space-y-6">
                {/* OUTILS DE RÉAPPROVISIONNEMENT RAPIDE CENTRAL */}
                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Réceptionner des Articles</h3>
                  <form onSubmit={handleCentralRestock} className="space-y-4">
                    <div>
                      <label className={STYLES.label}>Article à alimenter</label>
                      <select
                        required
                        className={STYLES.input}
                        value={centralRestockProdId}
                        onChange={(e) => setCentralRestockProdId(e.target.value)}
                      >
                        <option value="">Sélectionnez un produit...</option>
                        {produits.map(p => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={STYLES.label}>Quantité livrée au dépôt central</label>
                      <input
                        type="number"
                        required
                        min={1}
                        className={STYLES.input}
                        value={centralRestockQty}
                        onChange={(e) => setCentralRestockQty(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={centralLoading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Ajouter au Stock Central
                    </button>
                  </form>
                </div>

                {/* LIVRER / DISTRIBUER À UN VENDEUR */}
                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">LIVRER / DISTRIBUER À UN VENDEUR</h3>
                  <form onSubmit={handleDirectTransfer} className="space-y-4">
                    <div>
                      <label className={STYLES.label}>Vendeur destinataire</label>
                      <select
                        required
                        className={STYLES.input}
                        value={transferAgentId}
                        onChange={(e) => setTransferAgentId(e.target.value)}
                      >
                        <option value="">Sélectionnez un vendeur...</option>
                        {allUsers.filter(u => u.role === "vendeur" || u.role === "distributeur").map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={STYLES.label}>Article à livrer</label>
                      <select
                        required
                        className={STYLES.input}
                        value={transferProductId}
                        onChange={(e) => setTransferProductId(e.target.value)}
                      >
                        <option value="">Sélectionnez un produit...</option>
                        {produits.map(p => (
                          <option key={p.id} value={p.id}>{p.nom} ({p.stock} PCS dispo)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={STYLES.label}>Quantité à transférer</label>
                      <input
                        type="number"
                        required
                        min={1}
                        className={STYLES.input}
                        value={transferQty}
                        onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    {(() => {
                      const selectedTransferProduct = produits.find(p => p.id === transferProductId);
                      if (selectedTransferProduct && transferQty > selectedTransferProduct.stock) {
                        return (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg leading-tight">
                            ⚠️ Stock central insuffisant pour effectuer cette livraison !
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <button
                      type="submit"
                      disabled={transferLoading || (produits.find(p => p.id === transferProductId) ? transferQty > (produits.find(p => p.id === transferProductId)?.stock || 0) : false)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {transferLoading ? "Validation en cours..." : "Valider la livraison au vendeur"}
                    </button>
                  </form>
                </div>
              </div>

              {/* HISTORIQUE DES ARRIVAGES & CORRECTIONS AUTORISÉES POUR LE GESTIONNAIRE */}
              <div className={`${STYLES.card} lg:col-span-3 mt-6`}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      📜 Historique des Entrées / Arrivages au Dépôt Central
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Liste des réceptions enregistrées. En tant que Gestionnaire Stock, vous êtes autorisé à modifier ou annuler vos saisies en cas d'erreur.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Date d'Enregistrement</th>
                        <th className={STYLES.tableTh}>Produit / Article</th>
                        <th className={STYLES.tableTh}>Quantité Reçue</th>
                        <th className={STYLES.tableTh}>Enregistré par</th>
                        <th className={STYLES.tableTh + " text-right"}>Actions de Correction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockArrivals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">
                            Aucun arrivage enregistré dans le journal.
                          </td>
                        </tr>
                      ) : (
                        stockArrivals.map((arr) => (
                          <tr key={arr.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                            <td className={STYLES.tableTd}>{arr.date_enregistrement}</td>
                            <td className={`${STYLES.tableTd} font-bold text-slate-800`}>{arr.produit_nom}</td>
                            <td className={STYLES.tableTd}>
                              <span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {arr.quantite} PCS
                              </span>
                            </td>
                            <td className={STYLES.tableTd}>
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {arr.auteur_nom}
                              </span>
                            </td>
                            <td className={STYLES.tableTd + " text-right"}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingArrivalId(arr.id);
                                    setEditingArrivalQty(arr.quantite);
                                    setEditingArrivalProdNom(arr.produit_nom);
                                  }}
                                  className="px-2.5 py-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  <Pencil size={11} /> Corriger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteArrival(arr.id)}
                                  className="px-2.5 py-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  <Trash2 size={11} /> Annuler
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL DE CORRECTION D'ARRIVAGE (Gestionnaire & Admin) */}
              {editingArrivalId && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-100 p-5 animate-in fade-in zoom-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        ✏️ Corriger la Saisie de Stock
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingArrivalId(null)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleUpdateArrival} className="space-y-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Article à corriger</p>
                        <p className="text-xs font-extrabold text-slate-700 mt-0.5">{editingArrivalProdNom}</p>
                      </div>

                      <div>
                        <label className={STYLES.label}>Nouvelle Quantité Réelle</label>
                        <input
                          type="number"
                          required
                          min={1}
                          className={STYLES.input}
                          value={editingArrivalQty}
                          onChange={(e) => setEditingArrivalQty(parseInt(e.target.value) || 0)}
                        />
                        <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                          Le stock central s'ajustera automatiquement en soustrayant ou en ajoutant la différence.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingArrivalId(null)}
                          className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          Enregistrer la Correction
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB DEMANDES DE RÉASSORT (STOCK MANAGER VALIDEUR) */}
          {activeTab === "reassorts_validation" && user.role === "stock_caissier" && (
            <div className={STYLES.card}>
              <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Demandes de réassort des agents de terrain</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className={STYLES.tableTh}>Date</th>
                      <th className={STYLES.tableTh}>Agent</th>
                      <th className={STYLES.tableTh}>Produit demandé</th>
                      <th className={STYLES.tableTh}>Quantité</th>
                      <th className={STYLES.tableTh}>Statut</th>
                      <th className={STYLES.tableTh}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reassorts.map(r => (
                      <tr key={r.id}>
                        <td className={STYLES.tableTd}>{r.date_creation}</td>
                        <td className={`${STYLES.tableTd} font-bold`}>{r.agent_nom}</td>
                        <td className={STYLES.tableTd}>{r.produit_nom}</td>
                        <td className={`${STYLES.tableTd} font-black text-slate-800`}>{r.quantite} PCS</td>
                        <td className={STYLES.tableTd}>
                          <span className={r.statut === "valide" ? STYLES.badgeSuccess : r.statut === "refuse" ? STYLES.badgeDanger : STYLES.badgePending}>
                            {r.statut === "valide" ? "Validé" : r.statut === "refuse" ? "Refusé" : "En attente"}
                          </span>
                        </td>
                        <td className={STYLES.tableTd}>
                          {r.statut === "en_attente" ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleValidateReassort(r.id, true)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                              >
                                Valider & Livrer
                              </button>
                              <button
                                onClick={() => handleValidateReassort(r.id, false)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold"
                              >
                                Refuser
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[10px]">Traitée</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB VALIDATION REGLEMENTS (CAISSIER) */}
          {activeTab === "validation_reglements" && user.role === "stock_caissier" && (
            <div className={STYLES.card}>
              <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Registre des règlements et factures à valider</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className={STYLES.tableTh}>Date</th>
                      <th className={STYLES.tableTh}>Client</th>
                      <th className={STYLES.tableTh}>Agent de terrain</th>
                      <th className={STYLES.tableTh}>Montant dû</th>
                      <th className={STYLES.tableTh}>Mode de paiement</th>
                      <th className={STYLES.tableTh}>Validation</th>
                      <th className={STYLES.tableTh}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventes.map(v => (
                      <tr key={v.id}>
                        <td className={STYLES.tableTd}>{v.date_vente}</td>
                        <td className={`${STYLES.tableTd} font-bold`}>{v.client_nom}</td>
                        <td className={STYLES.tableTd}>{v.agent_nom}</td>
                        <td className={`${STYLES.tableTd} font-black text-emerald-800`}>
                          {v.total.toFixed(2)} USD / {v.total_cdf?.toLocaleString()} CDF
                        </td>
                        <td className={`${STYLES.tableTd} font-bold uppercase`}>{v.type_paiement}</td>
                        <td className={STYLES.tableTd}>
                          {v.statut_paiement === "valide" ? (
                            <span className={STYLES.badgeSuccess}>Enregistré & Validé</span>
                          ) : (
                            <button
                              onClick={() => handleValidateVentePayment(v.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold shadow-sm cursor-pointer"
                            >
                              Confirmer Encaissement
                            </button>
                          )}
                        </td>
                        <td className={STYLES.tableTd}>
                          <button
                            onClick={() => setSelectedVenteForReceipt(v)}
                            className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer flex items-center gap-1"
                          >
                            🧾 Reçu
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB PAIE DES COMMISSIONS (CAISSIER / COMPTABLE) */}
          {activeTab === "validation_paies" && user.role === "stock_caissier" && (
            <div className={STYLES.card}>
              <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Paiement des Commissions et Fixes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className={STYLES.tableTh}>Période</th>
                      <th className={STYLES.tableTh}>Agent</th>
                      <th className={STYLES.tableTh}>Ventes</th>
                      <th className={STYLES.tableTh}>Fixe</th>
                      <th className={STYLES.tableTh}>Commissions</th>
                      <th className={STYLES.tableTh}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map(f => (
                      <tr key={f.id}>
                        <td className={STYLES.tableTd}>{f.mois}</td>
                        <td className={`${STYLES.tableTd} font-bold`}>{f.agent_nom}</td>
                        <td className={STYLES.tableTd}>{f.ventes_count} Ventes</td>
                        <td className={STYLES.tableTd}>{f.salaire_fixe || 0} USD</td>
                        <td className={`${STYLES.tableTd} font-black text-emerald-800`}>
                          {f.total_commission_usd} USD + {f.total_commission_cdf.toLocaleString()} CDF
                        </td>
                        <td className={STYLES.tableTd}>
                          {f.statut === "en_attente" ? (
                            <button
                              onClick={() => handlePayFacture(f.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Décaisser Salaire
                            </button>
                          ) : (
                            <span className={STYLES.badgeSuccess}>Payé</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB VALIDATION PROTOCOLES (ADMIN) */}
          {activeTab === "protocoles_validation" && user.role === "admin" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PANNEAU DE GAUCHE : LISTE DES PROTOCOLES */}
              <div className="lg:col-span-1 space-y-4">
                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">
                    Protocoles Institutionnels
                  </h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {protocoles.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Aucun protocole enregistré.</p>
                    ) : (
                      protocoles.map(p => {
                        const isSelected = selectedProtocolId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedProtocolId(p.id)}
                            className={`p-3 border rounded-xl cursor-pointer transition-all ${isSelected ? "border-emerald-600 bg-emerald-50/40 shadow-sm" : "border-slate-100 hover:border-slate-200 bg-white"}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{p.institution}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Par {p.agent_nom}</p>
                              </div>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${p.statut === "valide" ? "bg-emerald-100 text-emerald-800" : p.statut === "rejete" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                                {p.statut === "valide" ? "Validé" : p.statut === "rejete" ? "Rejeté" : "En attente"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-dashed border-slate-100 text-[10px]">
                              <div>
                                <p className="text-slate-400 font-bold">BUDGET TOTAL</p>
                                <p className="font-extrabold text-slate-700">{p.montant_du_usd?.toFixed(2) || "0.00"} $</p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-400 font-bold">STATUT PAIEMENT</p>
                                <p className={`font-extrabold ${p.statut_paiement === "total" ? "text-emerald-600" : p.statut_paiement === "partiel" ? "text-amber-600" : "text-red-500"}`}>
                                  {p.statut_paiement === "total" ? "Totalement Payé" : p.statut_paiement === "partiel" ? "Acompte Payé" : "Non Payé"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* PANNEAU DE DROITE : DÉTAILS ET INTERACTION */}
              <div className="lg:col-span-2 space-y-6">
                {(() => {
                  const p = protocoles.find(proto => proto.id === selectedProtocolId);
                  if (!p) {
                    return (
                      <div className={`${STYLES.card} flex flex-col items-center justify-center text-center py-16 px-6`}>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4 text-slate-400">
                          <ClipboardList size={32} />
                        </div>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Sélectionnez un protocole</h4>
                        <p className="text-xs text-slate-400 max-w-sm mt-2">
                          Cliquez sur un protocole dans la liste à gauche pour consulter ses détails complets, ses paniers d'articles, suivre ses paiements d'acomptes, ajouter des bénéficiaires et exécuter la validation.
                        </p>
                      </div>
                    );
                  }

                  const detteUSD = p.montant_du_usd - p.montant_paye_usd;
                  const detteCDF = p.montant_du_cdf - p.montant_paye_cdf;
                  const hasDette = detteUSD > 0.01;

                  return (
                    <div className="space-y-6">
                      {/* DÉTAILS DU PROTOCOLE */}
                      <div className={STYLES.card}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Détails d'Institution</span>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">{p.institution}</h3>
                            <p className="text-xs text-slate-500 font-medium">Créé par {p.agent_nom} &middot; Quartier {p.quartier} &middot; {p.adresse}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedProtocolForFiche(p)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-1.5"
                            >
                              <span>🖨️</span> Fiche de Protocole
                            </button>
                            {p.statut === "en_attente" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleValidateProtocole(p.id, "valide")}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() => handleValidateProtocole(p.id, "rejete")}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer"
                                >
                                  Rejeter
                                </button>
                              </div>
                            )}
                            {p.statut !== "en_attente" && (
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${p.statut === "valide" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                                {p.statut === "valide" ? "Validé" : "Rejeté"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ALERTE DE DETTE / RETARD */}
                        {hasDette && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-4 flex items-center gap-3">
                            <AlertCircle className="text-red-500 shrink-0" size={16} />
                            <div>
                              <p className="text-xs font-black text-red-900 uppercase">Attention : Dette active</p>
                              <p className="text-xs font-bold text-red-700 mt-0.5">
                                Ce protocole présente un solde impayé de {detteUSD.toFixed(2)} USD / {detteCDF.toLocaleString()} CDF.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 text-xs">
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Montant Total Dû</p>
                            <p className="font-extrabold text-slate-800 mt-1">{p.montant_du_usd?.toFixed(2) || "0.00"} USD</p>
                            <p className="text-[10px] text-slate-500">≈ {p.montant_du_cdf?.toLocaleString() || "0"} CDF</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Total Déjà Payé</p>
                            <p className="font-extrabold text-emerald-600 mt-1">{p.montant_paye_usd?.toFixed(2) || "0.00"} USD</p>
                            <p className="text-[10px] text-slate-500">≈ {p.montant_paye_cdf?.toLocaleString() || "0"} CDF</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Dette Restante</p>
                            <p className={`font-extrabold mt-1 ${hasDette ? "text-red-600" : "text-slate-600"}`}>
                              {detteUSD.toFixed(2)} USD
                            </p>
                            <p className="text-[10px] text-slate-500">≈ {detteCDF.toLocaleString()} CDF</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-bold uppercase text-[9px]">Échéance de paiement</p>
                            <p className="font-extrabold text-slate-800 mt-1">{p.date_echeance || "Non définie"}</p>
                            <p className="text-[10px] text-slate-500">Règlement sous 30 jours</p>
                          </div>
                        </div>

                        {p.notes && (
                          <div className="mt-4 p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 text-xs">
                            <span className="font-bold text-slate-500">Notes d'observation :</span> {p.notes}
                          </div>
                        )}
                      </div>

                      {/* ENREGISTRER UN VERSEMENT (ACOMPTE OU DEUXIEME TRANCHE) */}
                      {p.statut === "valide" && hasDette && (
                        <div className={STYLES.card}>
                          <h4 className="text-xs font-black uppercase text-slate-700 mb-3 tracking-wider flex items-center gap-2">
                            <Coins size={14} className="text-emerald-600" /> Enregistrer un versement de paiement / acompte
                          </h4>
                          <form onSubmit={(e) => handleAddProtocolVersement(e, p.id)} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Montant du versement</label>
                              <input
                                type="number"
                                required
                                min={0.01}
                                step="any"
                                placeholder="0.00"
                                className={STYLES.input}
                                value={versemMontant}
                                onChange={(e) => setVersemMontant(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Devise</label>
                              <select
                                className={STYLES.input}
                                value={versemDevise}
                                onChange={(e) => setVersemDevise(e.target.value)}
                              >
                                <option value="USD">USD ($)</option>
                                <option value="CDF">CDF (FC)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Moyen de Règlement</label>
                              <select
                                className={STYLES.input}
                                value={versemMoyen}
                                onChange={(e) => setVersemMoyen(e.target.value)}
                              >
                                <option value="cash">Espèces / Cash</option>
                                <option value="mpesa">M-Pesa</option>
                                <option value="airtel_money">Airtel Money</option>
                                <option value="orange_money">Orange Money</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={versemLoading}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              {versemLoading ? "Enregistrement..." : "Ajouter le versement"}
                            </button>
                          </form>
                        </div>
                      )}

                      {/* LISTE DES BÉNÉFICIAIRES ACTUELS */}
                      <div className={STYLES.card}>
                        <h4 className="text-xs font-black uppercase text-slate-700 mb-3 tracking-wider">
                          Bénéficiaires & Paniers d'articles ({p.beneficiaires.length})
                        </h4>
                        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                          {p.beneficiaires.map((b, idx) => (
                            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                              <div>
                                <p className="font-extrabold text-slate-800 uppercase tracking-tight">{b.nom}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Tél : {b.telephone || "Aucun"} &middot; Adresse : {b.adresse || "Non définie"}</p>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Articles alloués :</span>
                                <div className="space-y-0.5 mt-1">
                                  {b.produits?.map((pr, pRowIdx) => (
                                    <p key={pRowIdx} className="font-extrabold text-slate-700 text-[10px]">
                                      {pr.quantite}x &mdash; {pr.produit_nom}
                                    </p>
                                  )) || (
                                    <p className="text-slate-400">Aucun produit</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FORMULAIRE D'AJOUT D'AVENANT EXCLUSIF ADMIN */}
                      <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3 mt-4">
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                          <UserPlus size={14} className="text-emerald-600" /> Ajouter un bénéficiaire (Avenant / Nouvel Entrant)
                        </h4>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase">
                          Note : Cet ajout (avenant) recalculera le total du protocole et impactera les commissions s'il est déjà validé.
                        </p>
                        <form onSubmit={(e) => handleAddDynamicBeneficiaire(e, p.id)} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Nom complet du bénéficiaire</label>
                              <input
                                type="text"
                                required
                                placeholder="Nom & Prénom"
                                className={STYLES.input}
                                value={newBenefNom}
                                onChange={(e) => setNewBenefNom(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Téléphone</label>
                              <input
                                type="text"
                                placeholder="+243..."
                                className={STYLES.input}
                                value={newBenefTel}
                                onChange={(e) => setNewBenefTel(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Adresse à Bukavu</label>
                              <input
                                type="text"
                                required
                                placeholder="Avenue, No..."
                                className={STYLES.input}
                                value={newBenefAdresse}
                                onChange={(e) => setNewBenefAdresse(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Date d'entrée (Avenant)</label>
                              <input
                                type="date"
                                required
                                className={STYLES.input}
                                value={newBenefDateEntree}
                                onChange={(e) => setNewBenefDateEntree(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Choix des produits */}
                          <div className="border-t border-slate-150/50 pt-2">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Articles ou Kits alloués</p>
                            {newBenefProduits.map((nbp, idx) => (
                              <div key={idx} className="flex gap-2 mb-2 items-center w-full">
                                <select
                                  required
                                  className="flex-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-800"
                                  value={nbp.produit_id}
                                  onChange={(e) => {
                                    const nextProds = [...newBenefProduits];
                                    nextProds[idx].produit_id = e.target.value;
                                    nextProds[idx].quantite = 1;
                                    setNewBenefProduits(nextProds);
                                  }}
                                >
                                  <option value="">-- Choisir un article / kit --</option>
                                  {produits.map((prod) => (
                                    <option key={prod.id} value={prod.id}>
                                      {prod.nom} ({prod.prix} {prod.devise || "USD"})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  className="w-20 p-2.5 border border-slate-300 rounded-xl text-center font-black text-slate-800 bg-white"
                                  placeholder="Qté"
                                  value={nbp.quantite || 1}
                                  onChange={(e) => {
                                    const nextProds = [...newBenefProduits];
                                    nextProds[idx].quantite = parseInt(e.target.value) || 1;
                                    setNewBenefProduits(nextProds);
                                  }}
                                />
                                {newBenefProduits.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setNewBenefProduits(newBenefProduits.filter((_, i) => i !== idx))}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {newBenefProduits.length < 5 && (
                              <button
                                type="button"
                                onClick={() => setNewBenefProduits([...newBenefProduits, { produit_id: "", quantite: 1 }])}
                                className="text-[10px] text-emerald-600 font-black hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                              >
                                <Plus size={11} /> Ajouter un autre produit au panier
                              </button>
                            )}
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={newBenefLoading}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer"
                            >
                              {newBenefLoading ? "Ajout en cours..." : "Ajouter au Protocole"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB CATALOGUE & STOCKS GLOBALS (ADMIN) */}
          {activeTab === "catalogue" && user.role === "admin" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LISTE DU CATALOGUE */}
              <div className={`${STYLES.card} lg:col-span-2`}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Catalogue Général des Produits et Kits</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Nom</th>
                        <th className={STYLES.tableTh}>Type</th>
                        <th className={STYLES.tableTh}>Prix unitaire</th>
                        <th className={STYLES.tableTh}>Stock global</th>
                        <th className={`${STYLES.tableTh} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produits.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                          <td className={`${STYLES.tableTd} font-bold text-slate-800`}>{p.nom}</td>
                          <td className={STYLES.tableTd}>
                            <span className="uppercase text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                              {p.type === "moustiquaire" ? "Moustiquaire" : "Consommable"}
                            </span>
                          </td>
                          <td className={`${STYLES.tableTd} font-black text-slate-700`}>{p.prix} {p.devise}</td>
                          <td className={`${STYLES.tableTd} font-extrabold text-blue-600`}>{p.stock} PCS</td>
                          <td className={`${STYLES.tableTd} text-right`}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setEditingProdNom(p.nom);
                                  setEditingProdPrix(p.prix);
                                  setEditingProdDevise(p.devise);
                                  setEditingProdType(p.type as "moustiquaire" | "consommable");
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Modifier"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OUTILS CREATION DU CATALOGUE */}
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Nouveau Produit / Kit</h3>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className={STYLES.label}>Nom de l'article</label>
                    <input
                      type="text"
                      required
                      placeholder="M-E PREMIUM..."
                      className={STYLES.input}
                      value={newProdNom}
                      onChange={(e) => setNewProdNom(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={STYLES.label}>Prix</label>
                      <input
                        type="number"
                        required
                        className={STYLES.input}
                        value={newProdPrix}
                        onChange={(e) => setNewProdPrix(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className={STYLES.label}>Devise</label>
                      <select
                        className={STYLES.input}
                        value={newProdDevise}
                        onChange={(e) => setNewProdDevise(e.target.value as "USD" | "CDF")}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="CDF">CDF (FC)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={STYLES.label}>Type</label>
                    <select
                      className={STYLES.input}
                      value={newProdType}
                      onChange={(e) => setNewProdType(e.target.value as "moustiquaire" | "consommable")}
                    >
                      <option value="moustiquaire">Moustiquaire</option>
                      <option value="consommable">Consommable</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all">
                    Enregistrer au Catalogue
                  </button>
                </form>
              </div>
            </div>

            {/* MODAL D'ÉDITION DU PRODUIT */}
            {editingProductId && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 p-6 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      ✏️ Modifier l'Article du Catalogue
                    </h3>
                    <button
                      onClick={() => setEditingProductId(null)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProductEdit} className="space-y-4">
                    <div>
                      <label className={STYLES.label}>Nom de l'article</label>
                      <input
                        type="text"
                        required
                        className={STYLES.input}
                        value={editingProdNom}
                        onChange={(e) => setEditingProdNom(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={STYLES.label}>Prix</label>
                        <input
                          type="number"
                          required
                          className={STYLES.input}
                          value={editingProdPrix}
                          onChange={(e) => setEditingProdPrix(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className={STYLES.label}>Devise</label>
                        <select
                          className={STYLES.input}
                          value={editingProdDevise}
                          onChange={(e) => setEditingProdDevise(e.target.value as "USD" | "CDF")}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="CDF">CDF (FC)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={STYLES.label}>Type</label>
                      <select
                        className={STYLES.input}
                        value={editingProdType}
                        onChange={(e) => setEditingProdType(e.target.value as "moustiquaire" | "consommable")}
                      >
                        <option value="moustiquaire">Moustiquaire</option>
                        <option value="consommable">Consommable</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingProductId(null)}
                        className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SUPERVISION GLOBALE & TRAÇABILITÉ DES STOCKS (ADMIN) */}
            <div className="mt-8 space-y-6">
              <div className="border-t border-slate-200 pt-6">
                <h2 className="text-sm font-black uppercase text-emerald-800 tracking-wider mb-2 flex items-center gap-2">
                  🛡️ Supervision Globale & Traçabilité des Stocks
                </h2>
                <p className="text-xs text-slate-500">
                  Suivi consolidé en temps réel du stock disponible au dépôt central, des volumes distribués aux agents et du stock restant sur le terrain.
                </p>
              </div>

              {/* KPI CARDS FOR STOCK */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${STYLES.card} bg-slate-50/50 border-l-4 border-l-blue-500`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Central Disponible</p>
                  <p className="text-lg font-black text-slate-800 mt-1">
                    {produits.reduce((acc, p) => acc + p.stock, 0)} <span className="text-xs font-bold text-slate-500">PCS</span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">Stock restant au magasin de Goma</p>
                </div>

                <div className={`${STYLES.card} bg-slate-50/50 border-l-4 border-l-emerald-500`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribué sur le Terrain</p>
                  <p className="text-lg font-black text-emerald-600 mt-1">
                    {agentStocks.reduce((acc, s) => acc + s.stock, 0)} <span className="text-xs font-bold text-slate-500">PCS</span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">Stock actuellement en possession des agents</p>
                </div>

                <div className={`${STYLES.card} bg-slate-50/50 border-l-4 border-l-amber-500`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flux Global Organisé</p>
                  <p className="text-lg font-black text-slate-800 mt-1">
                    {produits.reduce((acc, p) => acc + p.stock, 0) + agentStocks.reduce((acc, s) => acc + s.stock, 0)} <span className="text-xs font-bold text-slate-500">PCS</span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">Dépôt central + total chez les agents</p>
                </div>
              </div>

              {/* TABLE CONSOLIDÉE PAR PRODUIT */}
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">État Consolidé des Stocks par Produit</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Produit</th>
                        <th className={STYLES.tableTh}>Type</th>
                        <th className={STYLES.tableTh}>Stock Dépôt Central (Reste)</th>
                        <th className={STYLES.tableTh}>Stock Terrain (Distribué)</th>
                        <th className={STYLES.tableTh}>Total Logistique Actuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produits.map(p => {
                        const terrainStock = agentStocks.filter(s => s.produit_id === p.id).reduce((acc, s) => acc + s.stock, 0);
                        return (
                          <tr key={`supervision-${p.id}`} className="hover:bg-slate-50/50 border-b border-slate-100">
                            <td className={`${STYLES.tableTd} font-bold text-slate-800`}>{p.nom}</td>
                            <td className={STYLES.tableTd}>
                              <span className="uppercase text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                                {p.type === "moustiquaire" ? "Moustiquaire" : "Consommable"}
                              </span>
                            </td>
                            <td className={`${STYLES.tableTd} font-black text-blue-600`}>{p.stock} PCS</td>
                            <td className={`${STYLES.tableTd} font-black text-emerald-600`}>{terrainStock} PCS</td>
                            <td className={`${STYLES.tableTd} font-black text-slate-700`}>{p.stock + terrainStock} PCS</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STOCKS DÉTAILLÉS CHEZ CHAQUE AGENT */}
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">Détail des Stocks Restants par Agent Terrain</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Agent</th>
                        <th className={STYLES.tableTh}>Rôle</th>
                        <th className={STYLES.tableTh}>Statut</th>
                        {produits.map(p => (
                          <th key={`th-prod-${p.id}`} className={STYLES.tableTh}>{p.nom}</th>
                        ))}
                        <th className={STYLES.tableTh}>Total en Possession</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.filter(u => u.role === "vendeur" || u.role === "distributeur").length === 0 ? (
                        <tr>
                          <td colSpan={3 + produits.length} className="p-4 text-center text-slate-400">Aucun agent de terrain disponible.</td>
                        </tr>
                      ) : (
                        allUsers.filter(u => u.role === "vendeur" || u.role === "distributeur").map(u => {
                          let totalAgentUnits = 0;
                          return (
                            <tr key={`agent-stock-row-${u.id}`} className="hover:bg-slate-50/50 border-b border-slate-100">
                              <td className={`${STYLES.tableTd} font-bold text-slate-800`}>{u.name}</td>
                              <td className={STYLES.tableTd}>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${ROLE_COLORS[u.role]}`}>
                                  {ROLE_LABELS[u.role]}
                                </span>
                              </td>
                              {produits.map(p => {
                                const qty = agentStocks.find(s => s.agent_id === u.id && s.produit_id === p.id)?.stock || 0;
                                totalAgentUnits += qty;
                                return (
                                  <td key={`agent-${u.id}-prod-${p.id}`} className={`${STYLES.tableTd} font-extrabold ${qty < 5 ? "text-red-500" : "text-slate-700"}`}>
                                    {qty} PCS
                                  </td>
                                );
                              })}
                              <td className={`${STYLES.tableTd} font-black text-emerald-600`}>{totalAgentUnits} PCS</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* JOURNAL D'AUDIT & DROIT DE REGARD POUR L'ADMINISTRATEUR */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* 1. JOURNAL D'AUDIT & DE TRAÇABILITÉ */}
                <div className={`${STYLES.card} lg:col-span-1`}>
                  <h3 className="text-xs font-black uppercase text-emerald-800 tracking-wider mb-2 flex items-center gap-1.5">
                    🛡️ Journal d'Audit & de Traçabilité
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">
                    Registre inaltérable de chaque modification ou suppression
                  </p>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {auditLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Aucun log enregistré.</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150/50">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {log.action}
                            </span>
                            <span className="text-[8px] text-slate-400 font-semibold">{log.date}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 mt-2 leading-relaxed">
                            {log.details}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase text-right">
                            Par : {log.auteur}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. REGISTRE DES ARRIVAGES ET DROIT DE REGARD GLOBAL */}
                <div className={`${STYLES.card} lg:col-span-2`}>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                        📦 Registre des Arrivages de Stock Central
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        Droit de regard et de rectification globale pour l'Administrateur
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 sticky top-0 z-10">
                          <th className={STYLES.tableTh}>Date</th>
                          <th className={STYLES.tableTh}>Article</th>
                          <th className={STYLES.tableTh}>Quantité</th>
                          <th className={STYLES.tableTh}>Auteur</th>
                          <th className={STYLES.tableTh + " text-right"}>Supervision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockArrivals.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400">
                              Aucun enregistrement trouvé.
                            </td>
                          </tr>
                        ) : (
                          stockArrivals.map((arr) => (
                            <tr key={`admin-arr-${arr.id}`} className="hover:bg-slate-50/50 border-b border-slate-100">
                              <td className={STYLES.tableTd}>{arr.date_enregistrement}</td>
                              <td className={`${STYLES.tableTd} font-bold text-slate-800`}>{arr.produit_nom}</td>
                              <td className={STYLES.tableTd}>
                                <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  {arr.quantite} PCS
                                </span>
                              </td>
                              <td className={STYLES.tableTd}>
                                <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {arr.auteur_nom}
                                </span>
                              </td>
                              <td className={STYLES.tableTd + " text-right"}>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingArrivalId(arr.id);
                                      setEditingArrivalQty(arr.quantite);
                                      setEditingArrivalProdNom(arr.produit_nom);
                                    }}
                                    className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Rectifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteArrival(arr.id)}
                                    className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>)}

          {/* TAB PAIES ADMIN ET EXPORT PDF (ADMIN) */}
          {activeTab === "paies_admin" && user.role === "admin" && (
            <div className={STYLES.card}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Dossiers Mensuels Récapitulatifs & Fiches de Paie</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Calcul automatique de $40 fixe + 15% commissions pour les agents</p>
                </div>
                <button
                  onClick={handleGenerateFactures}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus size={14} /> Générer les fiches du mois
                </button>
              </div>

              {factures.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-bold uppercase">Aucune fiche de paie générée pour le moment</p>
                  <button onClick={handleGenerateFactures} className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-lg transition-colors">
                    Lancer la génération
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {factures.map(f => {
                    const agentVentesCount = ventes.filter(v => v.agent_id === f.agent_id && v.statut_paiement === "valide").length;
                    const agentProtocolesCount = protocoles.filter(p => p.agent_id === f.agent_id && p.statut === "valide").length;
                    const isPayed = f.statut === "paye";

                    return (
                      <div 
                        key={f.id}
                        onClick={() => setActiveFacture(f)}
                        className="group relative border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between">
                          <div className="p-3 bg-amber-50 group-hover:bg-amber-100 text-amber-500 group-hover:text-amber-600 rounded-xl transition-all duration-200">
                            <FolderClosed size={26} className="group-hover:hidden block" />
                            <FolderOpen size={26} className="group-hover:block hidden" />
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isPayed ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {isPayed ? "Réglé" : "En attente"}
                          </span>
                        </div>

                        <div className="mt-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{f.mois}</p>
                          <h4 className="text-xs font-black text-slate-800 uppercase mt-1 group-hover:text-emerald-700 transition-colors">{f.agent_nom}</h4>
                        </div>

                        <div className="border-t border-slate-100 pt-3 mt-4 space-y-2 text-[10px] text-slate-500 font-bold uppercase">
                          <div className="flex justify-between items-center">
                            <span>Ventes directes :</span>
                            <span className="font-extrabold text-slate-700">{agentVentesCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Protocoles apportés :</span>
                            <span className="font-extrabold text-slate-700">{agentProtocolesCount}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-50 pt-2 font-black text-slate-800">
                            <span>Commissions + Fixe :</span>
                            <span className="text-emerald-700">{(f.salaire_fixe || 40) + f.total_commission_usd} USD</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
                          <span>Action</span>
                          <span className="flex items-center gap-1 group-hover:underline">
                            Ouvrir Bulletin 📄
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB UTILISATEURS (ADMIN) - GESTION DES RÔLES ET WORKFLOW DE VALIDATION */}
          {activeTab === "utilisateurs" && user.role === "admin" && (
            <div className="space-y-6">
              <div className={STYLES.card}>
                <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">
                  Comptes d'utilisateurs et Rôles de l'asbl
                </h3>

                {/* FILTRES DE STATUTS UTILISATEURS */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setUserFilterStatut("tous")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${userFilterStatut === "tous" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    <span>Tous les comptes</span>
                    <span className="text-[10px] opacity-80">({allUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterStatut("en_attente")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${userFilterStatut === "en_attente" ? "bg-amber-500 text-white shadow-sm" : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"}`}
                  >
                    <span>⏳ En attente de validation</span>
                    <span className="text-[10px] font-black px-1.5 py-0.2 bg-amber-600 text-white rounded-full">
                      {allUsers.filter(u => u.statut === "en_attente").length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterStatut("valide")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${userFilterStatut === "valide" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"}`}
                  >
                    <span>✅ Validés</span>
                    <span className="text-[10px] opacity-80">({allUsers.filter(u => u.statut === "valide").length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterStatut("rejete")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${userFilterStatut === "rejete" ? "bg-red-600 text-white shadow-sm" : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"}`}
                  >
                    <span>❌ Rejetés</span>
                    <span className="text-[10px] opacity-80">({allUsers.filter(u => u.statut === "rejete").length})</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={STYLES.tableTh}>Nom complet</th>
                        <th className={STYLES.tableTh}>Email</th>
                        <th className={STYLES.tableTh}>Rôle</th>
                        <th className={STYLES.tableTh}>Statut</th>
                        <th className={STYLES.tableTh}>Commission (%)</th>
                        <th className={STYLES.tableTh}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(allUsers.length > 0 ? allUsers : localUsersTemplateForDisplay).filter(u => userFilterStatut === "tous" || u.statut === userFilterStatut).map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className={`${STYLES.tableTd} font-bold text-slate-800`}>
                            {u.name}
                          </td>
                          <td className={`${STYLES.tableTd} text-slate-700 font-medium`}>
                            {u.email}
                          </td>
                          <td className={STYLES.tableTd}>
                            <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${ROLE_COLORS[u.role]}`}>
                              {ROLE_LABELS[u.role]}
                            </span>
                          </td>
                          <td className={STYLES.tableTd}>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              u.statut === "en_attente"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : u.statut === "rejete"
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {u.statut === "en_attente" ? "⏳ En attente" : u.statut === "rejete" ? "❌ Rejeté" : "✅ Validé"}
                            </span>
                          </td>
                          <td className={STYLES.tableTd}>
                            {u.role === "vendeur" || u.role === "distributeur" ? (
                              <div className="flex items-center gap-2">
                                {editingUserId === u.id ? (
                                  <>
                                    <input
                                      type="number"
                                      className="w-16 px-1.5 py-0.5 text-xs border border-emerald-300 rounded text-center bg-white text-slate-900"
                                      value={editingCommissionVal}
                                      onChange={(e) => setEditingCommissionVal(e.target.value)}
                                      min={0}
                                      max={100}
                                    />
                                    <button
                                      onClick={() => handleSaveCommission(u.id)}
                                      className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm"
                                      title="Enregistrer"
                                    >
                                      <Check size={10} />
                                    </button>
                                    <button
                                      onClick={() => setEditingUserId(null)}
                                      className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                      title="Annuler"
                                    >
                                      <X size={10} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-extrabold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                                      {u.commission_rate ?? (u.role === "distributeur" ? 20 : 15)} %
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingUserId(u.id);
                                        setEditingCommissionVal((u.commission_rate ?? (u.role === "distributeur" ? 20 : 15)).toString());
                                      }}
                                      className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[9px] font-bold"
                                    >
                                      Modifier
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-semibold text-[10px]">&mdash;</span>
                            )}
                          </td>
                          <td className={STYLES.tableTd}>
                            <div className="flex items-center gap-1.5">
                              {u.statut === "en_attente" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setValidatingUser(u);
                                      setValidationRole(u.role || "vendeur");
                                      setValidationCommission(u.commission_rate ?? (u.role === "distributeur" ? 20 : 15));
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm flex items-center gap-1"
                                    title="Valider et activer ce compte"
                                  >
                                    <Check size={11} /> Valider
                                  </button>
                                  <button
                                    onClick={() => handleRejectUser(u)}
                                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-[10px] font-bold border border-red-200"
                                    title="Rejeter la demande"
                                  >
                                    <X size={11} /> Rejeter
                                  </button>
                                </>
                              )}
                              {u.id !== "u-admin" && u.email !== "admin@stoppaludisme.cd" ? (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Supprimer le compte"
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <span className="text-slate-400 font-semibold text-[10px]">Super Admin</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

                {/* FORMULAIRE D'AJOUT MANUEL D'UN COMPTE */}
                <div className={STYLES.card}>
                  <h3 className="text-xs font-black uppercase text-slate-700 mb-4 tracking-wider">
                    Créer un nouveau Compte
                  </h3>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                      <label className={STYLES.label}>Nom complet</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Patient Bagula"
                        className={STYLES.input}
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={STYLES.label}>Email professionnel</label>
                      <input
                        type="email"
                        required
                        placeholder="nom@stoppaludisme.cd"
                        className={STYLES.input}
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={STYLES.label}>Mot de passe initial</label>
                      <input
                        type="password"
                        required
                        placeholder="Saisissez un mot de passe..."
                        className={STYLES.input}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={STYLES.label}>Rôle de l'agent</label>
                      <select
                        className={STYLES.input}
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as User["role"])}
                      >
                        <option value="admin">Administrateur (Admin)</option>
                        <option value="vendeur">Agent Vendeur (Fixe 40$ + 15% Comm)</option>
                        <option value="distributeur">Agent Distributeur (Fixe 0$ + 20% Comm)</option>
                        <option value="stock_caissier">STOCK ET CAISSE</option>
                      </select>
                    </div>

                    <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                      Créer le compte
                    </button>
                  </form>
                </div>
            </div>
          )}

          {/* TAB PARAMÈTRES & PROFIL (POUR TOUS LES UTILISATEURS) */}
          {activeTab === "parametres" && (
            <div className="space-y-6">
              {/* CARTE PROFIL PERSONNEL */}
              <div className={STYLES.card}>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                      Mon Profil Utilisateur
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gérez vos informations d'identification et consultez vos droits d'accès
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveUserProfile} className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={STYLES.label}>Nom complet</label>
                      <input
                        type="text"
                        required
                        className={STYLES.input}
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={STYLES.label}>Numéro de téléphone</label>
                      <input
                        type="tel"
                        placeholder="+243..."
                        className={STYLES.input}
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={STYLES.label}>Adresse Email</label>
                      <input
                        type="text"
                        disabled
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed"
                        value={user.email}
                      />
                    </div>
                    <div>
                      <label className={STYLES.label}>Rôle attribué</label>
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`px-2.5 py-1 rounded-lg border text-xs font-black uppercase ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                        {(user.role === "vendeur" || user.role === "distributeur") && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            Commission: {currentCommissionRate}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                  >
                    <Check size={14} />
                    {profileSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                  </button>
                </form>
              </div>

              {/* CARTE ADMINISTRATION & TAUX DE CHANGE (ADMIN UNIQUEMENT) */}
              {user.role === "admin" && (
                <>
                  <div className={STYLES.card}>
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                        <Coins size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                          Taux de Change Officiel (USD / CDF)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Ce taux s'applique automatiquement à tous les calculs de vente, factures et salaires
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateRate} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 max-w-md">
                      <div className="relative flex-1 w-full">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">1 USD =</span>
                        <input
                          type="number"
                          required
                          min={1000}
                          max={5000}
                          className="w-full pl-16 pr-14 py-2 text-xs border border-slate-200 rounded-lg font-black text-slate-800 focus:outline-none focus:border-emerald-500"
                          value={rateEditVal}
                          onChange={(e) => setRateEditVal(e.target.value)}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-500">CDF</span>
                      </div>
                      <button
                        type="submit"
                        disabled={rateLoading}
                        className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                      >
                        {rateLoading ? "Sauvegarde..." : "Mettre à jour le taux"}
                      </button>
                    </form>
                  </div>

                  {/* CARTE MESSAGERIE INTERNE (ADMIN) */}
                  <div className={STYLES.card}>
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                        <Bell size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                          Diffuser un Message Interne aux Agents
                        </h3>
                        <p className="text-xs text-slate-500">
                          Envoie une alerte instantanée avec un point rouge sur la cloche de notification de vos équipes
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSendBroadcastMessage} className="space-y-4 max-w-xl">
                      <div>
                        <label className={STYLES.label}>Destinataires cibles</label>
                        <select
                          className={STYLES.input}
                          value={broadcastTargetRole}
                          onChange={(e) => setBroadcastTargetRole(e.target.value)}
                        >
                          <option value="all">Tous les collaborateurs (Diffusion globale)</option>
                          <option value="vendeur">Vendeurs de terrain uniquement</option>
                          <option value="distributeur">Distributeurs uniquement</option>
                          <option value="stock_caissier">Responsables Stock & Caisse uniquement</option>
                        </select>
                      </div>

                      <div>
                        <label className={STYLES.label}>Titre du message</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Réunion de briefing / Nouvel arrivage en stock..."
                          className={STYLES.input}
                          value={broadcastTitle}
                          onChange={(e) => setBroadcastTitle(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className={STYLES.label}>Contenu du message</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Rédigez les instructions ou informations à transmettre à vos agents..."
                          className={STYLES.input}
                          value={broadcastMessage}
                          onChange={(e) => setBroadcastMessage(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={broadcastLoading}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                      >
                        <Send size={14} />
                        {broadcastLoading ? "Diffusion..." : "Diffuser la notification"}
                      </button>
                    </form>
                  </div>
                </>
              )}

              {/* STATUT SUPABASE CLOUD & INFRASTRUCTURE */}
              <div className={STYLES.card}>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                      Infrastructure Base de Données
                    </h3>
                    <p className="text-xs text-slate-500">
                      État de la synchronisation Supabase Cloud et autonomie mobile APK
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Serveur Supabase Cloud :</span>
                    <span className="font-mono text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      https://rgbdhanxswglgflbkazs.supabase.co
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Mode de fonctionnement :</span>
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      100% Autonome (Supabase SDK + Cache Local Offline)
                    </span>
                  </div>
                </div>
              </div>

              {/* INFORMATIONS LÉGALES ET SOCIÉTÉ */}
              <div className={STYLES.card}>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                  <ShieldCheck className="text-emerald-600" size={18} />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    ETS LUMIÈRE DU CIEL &bull; STOP PALUDISME
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div>
                    <p className="font-bold text-slate-800">Siège Administratif :</p>
                    <p>12, Avenue Kibombo, Quartier Ndendere, Bukavu, Sud-Kivu, RDC</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Numéro RCCM & Identifiants :</p>
                    <p>RCCM CD/BKV/RCCM/23-A-01-303 &bull; Tél: +243 975 423 371</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB TOUS LES CLIENTS (ADMIN - FUSION DES CLIENTS) */}
          {activeTab === "tous_clients" && user.role === "admin" && (
            <div className={STYLES.card}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Gestion Générale de tous les Clients de la Force de Vente
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    Base unifiée fusionnant les ventes directes de terrain, points de distribution et bénéficiaires de protocoles
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setHistNom("");
                      setHistTel("");
                      setHistAdresse("");
                      setHistQuartier("Ibanda");
                      setHistType("client_individuel");
                      setHistMontantTotal("");
                      setHistDevise("USD");
                      setHistStatutPaiement("paye");
                      setHistDateTransaction(new Date().toISOString().split("T")[0]);
                      setHistAgentId(allUsers[0]?.id || "u-admin");
                      setHistNePasImpacterStock(true);
                      setHistSuccess("");
                      setHistError("");
                      setShowHistoryModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    + Enregistrer un client / protocole antérieur
                  </button>
                  {/* Indicateur de volume */}
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-[11px] font-bold text-slate-600">
                    Total : <span className="text-emerald-600 font-black">{unifiedClients.length}</span> Client(s)
                  </div>
                </div>
              </div>

              {/* MODAL D'ENREGISTREMENT D'HISTORIQUE PAPIER (Admin) */}
              {showHistoryModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-100 p-6 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                        📜 Enregistrer un client / protocole antérieur (Archive Papier)
                      </h3>
                      <button
                        onClick={() => setShowHistoryModal(false)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {histError && (
                      <div className="p-3 mb-4 text-xs font-bold bg-red-50 text-red-700 rounded-lg border border-red-100">
                        ⚠️ {histError}
                      </div>
                    )}

                    {histSuccess && (
                      <div className="p-3 mb-4 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                        ✅ {histSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSubmitHistory} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={STYLES.label}>Type d'enregistrement</label>
                          <select
                            className={STYLES.input}
                            value={histType}
                            onChange={(e) => setHistType(e.target.value as "client_individuel" | "protocole_entreprise")}
                          >
                            <option value="client_individuel">Vente / Client Individuel</option>
                            <option value="protocole_entreprise">Protocole d'Entreprise</option>
                          </select>
                        </div>
                        <div>
                          <label className={STYLES.label}>Date de la transaction</label>
                          <input
                            type="date"
                            required
                            className={STYLES.input}
                            value={histDateTransaction}
                            onChange={(e) => setHistDateTransaction(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={STYLES.label}>Nom du client / de l'institution</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Hôpital Provincial, Client Jean"
                            className={STYLES.input}
                            value={histNom}
                            onChange={(e) => setHistNom(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={STYLES.label}>Numéro de téléphone</label>
                          <input
                            type="text"
                            placeholder="Ex: +243 998..."
                            className={STYLES.input}
                            value={histTel}
                            onChange={(e) => setHistTel(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={STYLES.label}>Quartier / Avenue</label>
                          <select
                            className={STYLES.input}
                            value={histQuartier}
                            onChange={(e) => setHistQuartier(e.target.value)}
                          >
                            <option value="Ibanda">Ibanda</option>
                            <option value="Kadutu">Kadutu</option>
                            <option value="Panzi">Panzi</option>
                          </select>
                        </div>
                        <div>
                          <label className={STYLES.label}>Adresse physique précise</label>
                          <input
                            type="text"
                            placeholder="Ex: Av. de la Cathédrale n°12"
                            className={STYLES.input}
                            value={histAdresse}
                            onChange={(e) => setHistAdresse(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={STYLES.label}>Montant total</label>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Ex: 150"
                            className={STYLES.input}
                            value={histMontantTotal}
                            onChange={(e) => setHistMontantTotal(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={STYLES.label}>Devise</label>
                          <select
                            className={STYLES.input}
                            value={histDevise}
                            onChange={(e) => setHistDevise(e.target.value as "USD" | "CDF")}
                          >
                            <option value="USD">USD ($)</option>
                            <option value="CDF">CDF (FC)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={STYLES.label}>Statut du Paiement</label>
                          <select
                            className={STYLES.input}
                            value={histStatutPaiement}
                            onChange={(e) => setHistStatutPaiement(e.target.value as "paye" | "partiel" | "non_paye")}
                          >
                            <option value="paye">Payé en totalité</option>
                            <option value="partiel">Paiement partiel / Dette</option>
                            <option value="non_paye">Non payé</option>
                          </select>
                        </div>
                        <div>
                          <label className={STYLES.label}>Attribué à l'Agent / Auteur</label>
                          <select
                            className={STYLES.input}
                            value={histAgentId}
                            onChange={(e) => setHistAgentId(e.target.value)}
                          >
                            <option value="">-- Sélectionner l'agent auteur --</option>
                            {allUsers.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.role === "vendeur" ? "Agent Vendeur" : u.role === "distributeur" ? "Agent Distributeur" : u.role === "stock_caissier" ? "STOCK ET CAISSE" : u.role.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="histNePasImpacterStock"
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                          checked={histNePasImpacterStock}
                          onChange={(e) => setHistNePasImpacterStock(e.target.checked)}
                        />
                        <label htmlFor="histNePasImpacterStock" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                          Ne pas impacter le stock actuel (vente antérieure)
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2 text-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowHistoryModal(false)}
                          className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={histLoading}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {histLoading ? "Enregistrement..." : "Confirmer l'Enregistrement"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* BARRE DE RECHERCHE DANS LES CLIENTS */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, téléphone, quartier, provenance..."
                    className={`${STYLES.input} pl-9`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className={`${STYLES.input} w-40`}
                  value={filterQuartier}
                  onChange={(e) => setFilterQuartier(e.target.value)}
                >
                  <option value="">Tous les Quartiers</option>
                  <option value="Panzi">Panzi</option>
                  <option value="Kadutu">Kadutu</option>
                  <option value="Ibanda">Ibanda</option>
                </select>
              </div>

              {/* TABLEAU DES CLIENTS UNIFIÉ */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className={STYLES.tableTh}>Client / Bénéficiaire</th>
                      <th className={STYLES.tableTh}>Téléphone</th>
                      <th className={STYLES.tableTh}>Localisation (Bukavu)</th>
                      <th className={STYLES.tableTh}>Type / Provenance</th>
                      <th className={STYLES.tableTh}>Auteur / Enregistré par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = unifiedClients.filter(c => {
                        const matchesSearch =
                          c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.telephone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.quartier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.ajouteParNom.toLowerCase().includes(searchQuery.toLowerCase());
                        
                        const matchesQuartier = !filterQuartier || c.quartier.toLowerCase() === filterQuartier.toLowerCase();
                        return matchesSearch && matchesQuartier;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400 font-bold">
                              Aucun client trouvé correspondant aux critères de recherche.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className={`${STYLES.tableTd} font-extrabold text-slate-800 uppercase tracking-tight`}>
                            {c.nom}
                          </td>
                          <td className={STYLES.tableTd}>{c.telephone}</td>
                          <td className={STYLES.tableTd}>
                            <p className="font-bold text-slate-700">{c.adresse}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Quartier {c.quartier}</p>
                          </td>
                          <td className={STYLES.tableTd}>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              c.type.startsWith("Protocole") 
                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                : c.type === "Point de Distribution" 
                                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {c.type}
                            </span>
                          </td>
                          <td className={STYLES.tableTd}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700">{c.ajouteParNom}</span>
                              <span className={`self-start px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase tracking-tight ${
                                c.ajouteParRole.toLowerCase().includes("distrib")
                                  ? ROLE_COLORS["distributeur"]
                                  : c.ajouteParRole.toLowerCase().includes("vendeur")
                                    ? ROLE_COLORS["vendeur"]
                                    : ROLE_COLORS["admin"]
                              }`}>
                                {c.ajouteParRole === "distributeur" ? "Distributeur" : c.ajouteParRole === "vendeur" ? "Vendeur" : c.ajouteParRole}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB HISTORIQUE GÉNÉRAL & TRANSACTIONS (ADMIN) */}
          {activeTab === "historique_general" && user.role === "admin" && (
            <div className={STYLES.card}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                    📜 Registre Historique Général & Transactions
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    Supervision complète de l'activité commerciale, des mouvements logistiques et de la caisse
                  </p>
                </div>
              </div>

              {/* BARRE DE FILTRES RAPIDES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    Filtrer par Agent / Utilisateur
                  </label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700"
                    value={adminHistFilterAgent}
                    onChange={(e) => setAdminHistFilterAgent(e.target.value)}
                  >
                    <option value="">-- Tout afficher --</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({ROLE_LABELS[u.role]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    Filtrer par Type d'Opération
                  </label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700"
                    value={adminHistFilterType}
                    onChange={(e) => setAdminHistFilterType(e.target.value)}
                  >
                    <option value="">-- Toutes les opérations --</option>
                    <option value="Vente">Ventes de terrain & distributeurs</option>
                    <option value="Entrée Stock Central">Entrées Dépôt Central (Arrivages)</option>
                    <option value="Livraison Agent">Distributions & Livraisons Agents</option>
                    <option value="Règlement / Caisse">Mouvements Caisse & Règlements</option>
                    <option value="Autre">Corrections & Annulations</option>
                  </select>
                </div>
              </div>

              {/* TABLEAU HISTORIQUE UNIFIÉ CHRONOLOGIQUE */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100/60 text-slate-700 uppercase text-[9px] tracking-wider font-extrabold">
                      <th className={`${STYLES.tableTh} py-3`}>Date & Heure</th>
                      <th className={STYLES.tableTh}>Type d'Opération</th>
                      <th className={STYLES.tableTh}>Agent Auteur</th>
                      <th className={STYLES.tableTh}>Description du Mouvement</th>
                      <th className={STYLES.tableTh + " text-right"}>Montant / Flux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // 1. Réunir toutes les opérations
                      const list: Array<{
                        id: string;
                        date: string;
                        type: "Vente" | "Entrée Stock Central" | "Livraison Agent" | "Règlement / Caisse" | "Autre";
                        agent: string;
                        details: string;
                        montant?: string;
                        origin: any;
                      }> = [];

                      // Ventes
                      ventes.forEach((v) => {
                        list.push({
                          id: `v-${v.id}`,
                          date: v.date_vente,
                          type: "Vente",
                          agent: v.agent_nom,
                          details: `Vente au client "${v.client_nom}" (Kits: ${v.details || "Articles"}) &middot; Mode: ${v.type_paiement}`,
                          montant: `${v.total.toFixed(2)} USD / ${v.total_cdf?.toLocaleString()} CDF`,
                          origin: v
                        });
                      });

                      // Entrées de stock central
                      stockArrivals.forEach((arr) => {
                        list.push({
                          id: `arr-${arr.id}`,
                          date: arr.date_enregistrement,
                          type: "Entrée Stock Central",
                          agent: arr.auteur_nom,
                          details: `Arrivage direct au dépôt central: ${arr.produit_nom}`,
                          montant: `+${arr.quantite} PCS`,
                          origin: arr
                        });
                      });

                      // Logs d'audit (Livraisons, Règlements, etc.)
                      auditLogs.forEach((log) => {
                        if (log.action === "Livraison Agent") {
                          list.push({
                            id: `log-${log.id}`,
                            date: log.date,
                            type: "Livraison Agent",
                            agent: log.auteur || "Stock & Caisse",
                            details: log.details,
                            origin: log
                          });
                        } else if (
                          log.action.includes("Règlement") || 
                          log.action.includes("Caisse") || 
                          log.action.includes("Commission") || 
                          log.action.includes("Facture")
                        ) {
                          list.push({
                            id: `log-${log.id}`,
                            date: log.date,
                            type: "Règlement / Caisse",
                            agent: log.auteur || "Stock & Caisse",
                            details: log.details,
                            origin: log
                          });
                        } else if (
                          log.action.includes("Suppression") || 
                          log.action.includes("Correction") || 
                          log.action.includes("Modification")
                        ) {
                          list.push({
                            id: `log-${log.id}`,
                            date: log.date,
                            type: "Autre",
                            agent: log.auteur || "Administrateur",
                            details: log.details,
                            origin: log
                          });
                        }
                      });

                      // Trier par date décroissante (plus récent d'abord)
                      list.sort((a, b) => b.date.localeCompare(a.date));

                      // Appliquer les filtres
                      const filtered = list.filter((item) => {
                        const matchesAgent = !adminHistFilterAgent || item.agent.toLowerCase().includes(adminHistFilterAgent.toLowerCase()) || item.details.toLowerCase().includes(adminHistFilterAgent.toLowerCase());
                        const matchesType = !adminHistFilterType || item.type === adminHistFilterType;
                        return matchesAgent && matchesType;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                              Aucune opération trouvée avec les filtres sélectionnés.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((item) => {
                        const badgeStyle = 
                          item.type === "Vente" ? "bg-emerald-100 text-emerald-800" :
                          item.type === "Entrée Stock Central" ? "bg-blue-100 text-blue-800" :
                          item.type === "Livraison Agent" ? "bg-purple-100 text-purple-800" :
                          item.type === "Règlement / Caisse" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-800";

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedLogDetail({ log: { id: item.id, date: item.date, details: item.details.replace(/&middot;/g, " - "), auteur: item.agent, action: item.type }, qty: 1, productName: item.type, prod: null })}
                            className="hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                          >
                            <td className={STYLES.tableTd}>{item.date}</td>
                            <td className={STYLES.tableTd}>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeStyle}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className={`${STYLES.tableTd} font-extrabold text-slate-700`}>{item.agent}</td>
                            <td 
                              className={`${STYLES.tableTd} font-medium text-slate-600`}
                              dangerouslySetInnerHTML={{ __html: item.details }}
                            />
                            <td className={`${STYLES.tableTd} text-right font-black ${item.montant?.includes("+") ? "text-blue-600" : "text-emerald-700"}`}>
                              {item.montant || <span className="text-slate-400 font-bold">&mdash;</span>}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* MOCK USERS POUR ADMIN DISPLAY */}
      {(() => {
        // template global
        return null;
      })()}

      {/* MODAL PROTOCOLE VENDEUR (DÉTAILS + AJOUT DE BÉNÉFICIAIRE EXCLUSIF) */}
      {selectedSellerProtocol && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FolderOpen className="text-amber-500" size={18} />
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800">
                    Dossier Protocole - {selectedSellerProtocol.institution}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Créé le {selectedSellerProtocol.date_creation} &middot; Échéance: {selectedSellerProtocol.date_echeance}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-seller-print-fiche"
                  onClick={() => {
                    setSelectedProtocolForFiche(selectedSellerProtocol);
                    setTimeout(() => {
                      window.print();
                    }, 150);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <span>🖨️</span> Imprimer la Fiche
                </button>
                <button
                  onClick={() => {
                    setSelectedSellerProtocol(null);
                    setNewBenefNom("");
                    setNewBenefTel("");
                    setNewBenefAdresse("");
                    setNewBenefProduits([{ produit_id: "", quantite: 1 }]);
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CONTENU DE LA MODAL */}
            <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
              {/* CARTES STATS DU PROTOCOLE */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-black uppercase">Statut Validation</p>
                  <p className="text-xs font-extrabold mt-1">
                    {selectedSellerProtocol.statut === "valide" ? (
                      <span className="text-emerald-600">Validé</span>
                    ) : selectedSellerProtocol.statut === "rejete" ? (
                      <span className="text-red-500">Rejeté</span>
                    ) : (
                      <span className="text-amber-500">En attente</span>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-black uppercase">Total Dû</p>
                  <p className="text-xs font-black text-slate-700 mt-1">
                    {selectedSellerProtocol.montant_du_usd.toFixed(2)} $
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {selectedSellerProtocol.montant_du_cdf.toLocaleString()} CDF
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-black uppercase">Total Payé</p>
                  <p className="text-xs font-black text-emerald-600 mt-1">
                    {selectedSellerProtocol.montant_paye_usd.toFixed(2)} $
                  </p>
                  <p className="text-[10px] text-emerald-600/80 font-semibold">
                    {selectedSellerProtocol.montant_paye_cdf.toLocaleString()} CDF
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[9px] text-slate-400 font-black uppercase">Statut Paiement</p>
                  <p className="text-xs font-extrabold mt-1">
                    {selectedSellerProtocol.statut_paiement === "total" ? (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Soldé</span>
                    ) : selectedSellerProtocol.statut_paiement === "partiel" ? (
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">Partiel</span>
                    ) : (
                      <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full text-[10px]">Impayé</span>
                    )}
                  </p>
                </div>
              </div>

              {/* LISTE DES BÉNÉFICIAIRES */}
              <div className="border border-slate-150 rounded-xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Bénéficiaires enregistrés ({selectedSellerProtocol.beneficiaires.length})
                </h4>
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto pr-1">
                  {selectedSellerProtocol.beneficiaires.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Aucun bénéficiaire dans ce protocole.</p>
                  ) : (
                    selectedSellerProtocol.beneficiaires.map((b, idx) => (
                      <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div>
                          <p className="font-extrabold text-slate-800 uppercase tracking-tight">{b.nom}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Tél : {b.telephone || "Aucun"} &middot; Adresse : {b.adresse || "Non spécifiée"}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-[10px] font-extrabold text-slate-700">
                            {b.produits?.map((pr) => `${pr.quantite}x ${pr.produit_nom}`).join(", ")}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                            Total : {b.total_usd.toFixed(2)} $ ({b.total_cdf.toLocaleString()} CDF)
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* FORMULAIRE AJOUT DE BÉNÉFICIAIRE (AVENANT) */}
              {(user.role === "vendeur" || user.role === "admin") && (
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                    <UserPlus size={14} className="text-emerald-600" /> Ajouter un nouveau bénéficiaire (Avenant / Nouvel Entrant)
                  </h4>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase">
                    Note : Cet ajout (avenant) recalculera le total du protocole et générera immédiatement la commission s'il est déjà validé.
                  </p>
                  <form onSubmit={(e) => handleAddDynamicBeneficiaire(e, selectedSellerProtocol.id)} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nom complet</label>
                        <input
                          type="text"
                          required
                          placeholder="Nom de la personne"
                          className={STYLES.input}
                          value={newBenefNom}
                          onChange={(e) => setNewBenefNom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Téléphone</label>
                        <input
                          type="text"
                          placeholder="+243..."
                          className={STYLES.input}
                          value={newBenefTel}
                          onChange={(e) => setNewBenefTel(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Adresse à Bukavu</label>
                        <input
                          type="text"
                          required
                          placeholder="Avenue, No..."
                          className={STYLES.input}
                          value={newBenefAdresse}
                          onChange={(e) => setNewBenefAdresse(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Date d'entrée (Avenant)</label>
                        <input
                          type="date"
                          required
                          className={STYLES.input}
                          value={newBenefDateEntree}
                          onChange={(e) => setNewBenefDateEntree(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Choix des produits */}
                    <div className="border-t border-slate-150/50 pt-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Articles alloués</p>
                      {newBenefProduits.map((nbp, idx) => (
                        <div key={idx} className="flex gap-2 mb-2 items-center w-full">
                          <select
                            required
                            className="flex-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            value={nbp.produit_id}
                            onChange={(e) => {
                              const nextProds = [...newBenefProduits];
                              nextProds[idx].produit_id = e.target.value;
                              nextProds[idx].quantite = 1;
                              setNewBenefProduits(nextProds);
                            }}
                          >
                            <option value="">-- Choisir un article / kit --</option>
                            {produits.map((prod) => (
                              <option key={prod.id} value={prod.id} className="text-slate-800">
                                {prod.nom} ({prod.prix} {prod.devise || "USD"})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            required
                            min="1"
                            className="w-20 p-2.5 border border-slate-300 rounded-xl text-center font-black text-slate-800 bg-white"
                            placeholder="Qté"
                            value={nbp.quantite || 1}
                            onChange={(e) => {
                              const nextProds = [...newBenefProduits];
                              nextProds[idx].quantite = parseInt(e.target.value) || 1;
                              setNewBenefProduits(nextProds);
                            }}
                          />
                          {newBenefProduits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNewBenefProduits(newBenefProduits.filter((_, i) => i !== idx))}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      {newBenefProduits.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setNewBenefProduits([...newBenefProduits, { produit_id: "", quantite: 1 }])}
                          className="text-[10px] text-emerald-600 font-black hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <Plus size={11} /> Ajouter un autre produit à son panier
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={newBenefLoading}
                        className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
                      >
                        {newBenefLoading ? "Ajout..." : "Confirmer et ajouter"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  setSelectedSellerProtocol(null);
                  setNewBenefNom("");
                  setNewBenefTel("");
                  setNewBenefAdresse("");
                  setNewBenefProduits([{ produit_id: "", quantite: 1 }]);
                }}
                className={STYLES.btnSecondary}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESSION FICHE DE PAIE / TÉLÉCHARGEMENT PDF */}
      {activeFacture && (() => {
        const salaireFixe = activeFacture.salaire_fixe || 40;
        const commissionsUsd = activeFacture.total_commission_usd || 0;
        const commissionsCdf = activeFacture.total_commission_cdf || 0;
        const brutUsd = salaireFixe + commissionsUsd;
        const brutCdf = commissionsCdf;
        
        const tvaUsd = brutUsd * 0.15;
        const tvaCdf = brutCdf * 0.15;
        
        const netUsd = brutUsd - tvaUsd;
        const netCdf = brutCdf - tvaCdf;

        const agentVentesCount = ventes.filter(v => v.agent_id === activeFacture.agent_id && v.statut_paiement === "valide").length;
        const agentProtocolesCount = protocoles.filter(p => p.agent_id === activeFacture.agent_id && p.statut === "valide").length;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-sm font-black uppercase text-slate-800">Bulletin de Paie Officiel</h3>
                <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X size={18} />
                </button>
              </div>

              {/* PREVISUALISATION IMPRIMABLE DE LA FICHE DE PAIE */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 border border-slate-100 rounded-xl my-4">
                <div id="printable-paycheck-area" className="bg-white p-6 rounded border border-slate-200 shadow-sm/30">
                  {/* EN-TÊTE ETS LUMIÈRE DU CIEL */}
                  <div className="header" style={{ textAlign: "center", marginBottom: "25px", borderBottom: "2px solid #059669", paddingBottom: "15px" }}>
                    <h1 style={{ color: "#059669", margin: 0, fontSize: "20px", fontWeight: "800", textTransform: "uppercase" }}>{COMPAGNIE_INFO.nom}</h1>
                    <h2 style={{ color: "#0d9488", margin: "2px 0", fontSize: "14px", fontWeight: "bold" }}>{COMPAGNIE_INFO.nomEts}</h2>
                    <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569", fontWeight: "600" }}>{COMPAGNIE_INFO.rccm}</p>
                    <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569" }}>{COMPAGNIE_INFO.siege}</p>
                    <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569" }}>Email: {COMPAGNIE_INFO.email} | Tél: {COMPAGNIE_INFO.telephones.join(" / ")}</p>
                  </div>

                  <div className="title" style={{ fontSize: "15px", fontWeight: "bold", textAlign: "center", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.5px", border: "1px solid #cbd5e1", padding: "8px", background: "#f8fafc" }}>
                    BULLETIN DE PAIE DE L'AGENT DE TERRAIN
                  </div>

                  <div className="details" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px", fontSize: "11px" }}>
                    <div>
                      <p style={{ margin: "4px 0" }}><strong>Nom de l'Agent :</strong> {activeFacture.agent_nom}</p>
                      <p style={{ margin: "4px 0" }}><strong>Rôle Professionnel :</strong> Agent Terrain (Ventes & Protocoles)</p>
                      <p style={{ margin: "4px 0" }}><strong>Ventes Validées :</strong> {agentVentesCount}</p>
                    </div>
                    <div>
                      <p style={{ margin: "4px 0" }}><strong>Période :</strong> {activeFacture.mois}</p>
                      <p style={{ margin: "4px 0" }}><strong>Date d'Émission :</strong> {activeFacture.date_creation}</p>
                      <p style={{ margin: "4px 0" }}><strong>Protocoles Apportés :</strong> {agentProtocolesCount}</p>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "25px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "left", fontSize: "10px", textTransform: "uppercase" }}>Désignation Rubrique</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right", fontSize: "10px", textTransform: "uppercase" }}>Quantité / Base</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right", fontSize: "10px", textTransform: "uppercase" }}>Gains / Retenues (USD)</th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "8px", textAlign: "right", fontSize: "10px", textTransform: "uppercase" }}>Gains / Retenues (CDF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>Salaire de Base Fixe de terrain</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>1 Mois</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{salaireFixe.toFixed(2)} USD</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>-</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>Commissions cumulées sur moustiquaires ($)</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{agentVentesCount} Ventes</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{commissionsUsd.toFixed(2)} USD</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>-</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>Commissions cumulées sur consommables (FC)</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{agentVentesCount} Ventes</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>-</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{commissionsCdf.toLocaleString()} CDF</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>Protocoles apportés (Validation)</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{agentProtocolesCount} Actifs</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>-</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>-</td>
                      </tr>
                      <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>SALAIRE BRUT TOTAL DÛ</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>Brut</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{brutUsd.toFixed(2)} USD</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>{brutCdf.toLocaleString()} CDF</td>
                      </tr>
                      <tr style={{ fontStyle: "italic", color: "#ef4444" }}>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>Déduction de la TVA (15%) sur salaire</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>15% d'impôt</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#ef4444" }}>-{tvaUsd.toFixed(2)} USD</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#ef4444" }}>-{tvaCdf.toLocaleString()} CDF</td>
                      </tr>
                      <tr style={{ fontWeight: "bold", backgroundColor: "#f0fdf4" }}>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", color: "#16a34a" }}>NET À PAYER TOTAL (NET DE TVA)</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#16a34a" }}>Net net</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#16a34a" }}>{netUsd.toFixed(2)} USD</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#16a34a" }}>{netCdf.toLocaleString()} CDF</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="signatures" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "40px", fontSize: "10px" }}>
                    <div className="sig-box" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px", textAlign: "center", height: "50px" }}>
                      Pour l'Établissement ETS LUMIÈRE DU CIEL (Direction)
                    </div>
                    <div className="sig-box" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px", textAlign: "center", height: "50px" }}>
                      Signature de l'Agent Bénéficiaire
                    </div>
                  </div>
                </div>
              </div>

              <div className="no-print flex justify-end gap-3 pt-4 border-t">
                <button onClick={handleClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md">Fermer</button>
                <button id="btn-print-paycheck" onClick={handlePrint} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium flex items-center gap-2">🖨️ Imprimer Bulletin</button>
                <button id="btn-download-paycheck-pdf" onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2">📥 Télécharger PDF</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL REÇU CLIENT INDIVIDUEL */}
      {selectedVenteForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-black uppercase text-slate-800">Visualisation du Reçu Client</h3>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 border border-slate-100 rounded-xl my-4">
              <div id="printable-receipt-area" className="bg-white p-6 rounded border border-slate-200 shadow-sm/30">
                <div className="header" style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #059669", paddingBottom: "12px" }}>
                  <h1 style={{ color: "#059669", margin: 0, fontSize: "20px", fontWeight: "800", textTransform: "uppercase" }}>{COMPAGNIE_INFO.nom}</h1>
                  <h2 style={{ color: "#0d9488", margin: "2px 0", fontSize: "14px", fontWeight: "bold" }}>{COMPAGNIE_INFO.nomEts}</h2>
                  <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569", fontWeight: "600" }}>{COMPAGNIE_INFO.rccm}</p>
                  <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569" }}>{COMPAGNIE_INFO.siege}</p>
                  <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569" }}>Email: {COMPAGNIE_INFO.email} | Tél: {COMPAGNIE_INFO.telephones.join(" / ")}</p>
                </div>

                <div className="title" style={{ fontSize: "14px", fontWeight: "bold", textAlign: "center", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#0f172a", border: "1px solid #cbd5e1", padding: "6px", background: "#f8fafc" }}>
                  REÇU DE CAISSE / PAIEMENT INDIVIDUEL
                </div>

                <div className="details" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px", fontSize: "11px" }}>
                  <div>
                    <p style={{ margin: "3px 0" }}><strong>N° Reçu :</strong> REC-{selectedVenteForReceipt.id?.toUpperCase()}</p>
                    <p style={{ margin: "3px 0" }}><strong>Nom du Client :</strong> {selectedVenteForReceipt.client_nom}</p>
                    <p style={{ margin: "3px 0" }}><strong>Quartier / Adresse :</strong> {selectedVenteForReceipt.quartier || "Non spécifié"}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "3px 0" }}><strong>Date & Heure :</strong> {selectedVenteForReceipt.date_vente || new Date().toLocaleDateString()}</p>
                    <p style={{ margin: "3px 0" }}><strong>Vendeur / Agent :</strong> {selectedVenteForReceipt.agent_nom}</p>
                    <p style={{ margin: "3px 0" }}><strong>Mode de Paiement :</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{selectedVenteForReceipt.type_paiement}</span></p>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "left" }}>Description de l'article / kit</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "center", width: "80px" }}>Quantité</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "right", width: "100px" }}>Prix Unitaire</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "right", width: "120px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVenteForReceipt.produits?.map((pItem, pIdx) => {
                      const itemTotal = pItem.quantite * pItem.prix_unitaire;
                      return (
                        <tr key={pIdx}>
                          <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>{pItem.produit_nom}</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "center" }}>{pItem.quantite}</td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>
                            {pItem.prix_unitaire.toFixed(2)} {pItem.devise || "USD"}
                          </td>
                          <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", fontWeight: "bold" }}>
                            {itemTotal.toFixed(2)} {pItem.devise || "USD"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                      <td colSpan={3} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>MONTANT TOTAL BRUT :</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>
                        {selectedVenteForReceipt.total.toFixed(2)} USD
                      </td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f1f5f9" }}>
                      <td colSpan={3} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#059669" }}>MONTANT TOTAL PAYÉ :</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#059669" }}>
                        {selectedVenteForReceipt.total.toFixed(2)} USD <br/>
                        <span style={{ fontSize: "9px", color: "#475569" }}>≈ {selectedVenteForReceipt.total_cdf?.toLocaleString() || Math.round(selectedVenteForReceipt.total * exchangeRate).toLocaleString()} CDF</span>
                      </td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#fff" }}>
                      <td colSpan={3} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>SOLDE RESTANT :</td>
                      <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#ef4444" }}>
                        0.00 USD
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="signatures" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "30px", fontSize: "10px" }}>
                  <div className="sig-box" style={{ borderTop: "1px dashed #94a3b8", paddingTop: "6px", textAlign: "center", height: "50px" }}>
                    Pour l'Établissement (Caissier/Vendeur)
                  </div>
                  <div className="sig-box" style={{ borderTop: "1px dashed #94a3b8", paddingTop: "6px", textAlign: "center", height: "50px" }}>
                    Signature du Client (Pour acquit)
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex justify-end gap-3 pt-4 border-t">
              <button onClick={handleClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md">Fermer</button>
              <button id="btn-print-receipt" onClick={handlePrint} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium flex items-center gap-2">🖨️ Imprimer Reçu</button>
              <button id="btn-download-receipt-pdf" onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2">📥 Télécharger PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHE DE PROTOCOLE D'ACCORD */}
      {selectedProtocolForFiche && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-black uppercase text-slate-800">Visualisation de la Fiche de Protocole</h3>
              <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 border border-slate-100 rounded-xl my-4">
              <div id="printable-protocol-fiche" className="bg-white p-6 rounded border border-slate-200 shadow-sm/30">
                <div className="header" style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #059669", paddingBottom: "12px" }}>
                  <h1 style={{ color: "#059669", margin: 0, fontSize: "20px", fontWeight: "800", textTransform: "uppercase" }}>{COMPAGNIE_INFO.nom}</h1>
                  <h2 style={{ color: "#0d9488", margin: "2px 0", fontSize: "14px", fontWeight: "bold" }}>{COMPAGNIE_INFO.nomEts}</h2>
                  <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569", fontWeight: "600" }}>{COMPAGNIE_INFO.rccm}</p>
                  <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569" }}>{COMPAGNIE_INFO.siege}</p>
                  <p style={{ margin: "2px 0", fontSize: "10px", color: "#475569" }}>Email: {COMPAGNIE_INFO.email} | Tél: {COMPAGNIE_INFO.telephones.join(" / ")}</p>
                </div>

                <div className="title" style={{ fontSize: "14px", fontWeight: "bold", textAlign: "center", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#0f172a", border: "1px solid #cbd5e1", padding: "6px", background: "#f8fafc" }}>
                  FICHE TECHNIQUE DU PROTOCOLE D'ACCORD INSTITUTIONNEL
                </div>

                <div className="details" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px", fontSize: "11px" }}>
                  <div>
                    <p style={{ margin: "3px 0" }}><strong>Institution Cliente :</strong> {selectedProtocolForFiche.institution}</p>
                    <p style={{ margin: "3px 0" }}><strong>Vendeur / Agent de terrain :</strong> {selectedProtocolForFiche.agent_nom}</p>
                    <p style={{ margin: "3px 0" }}><strong>Quartier de distribution :</strong> {selectedProtocolForFiche.quartier}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "3px 0" }}><strong>Date de Prise d'Effet :</strong> {selectedProtocolForFiche.date_creation}</p>
                    <p style={{ margin: "3px 0" }}><strong>Date d'Échéance de Règlement :</strong> {selectedProtocolForFiche.date_echeance || "Sous 30 jours"}</p>
                    <p style={{ margin: "3px 0" }}><strong>Statut de Paiement :</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold", color: selectedProtocolForFiche.statut_paiement === "total" ? "#16a34a" : selectedProtocolForFiche.statut_paiement === "partiel" ? "#d97706" : "#dc2626" }}>{selectedProtocolForFiche.statut_paiement === "total" ? "Totalement réglé" : selectedProtocolForFiche.statut_paiement === "partiel" ? "Acompte versé" : "Impayé / Encours"}</span></p>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "center", width: "40px" }}>N°</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "left" }}>Nom & Prénom du Bénéficiaire</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "left", width: "110px" }}>Téléphone / Coordonnées</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "left" }}>Article / Kit attribué</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "center", width: "60px" }}>Quantité</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "right", width: "90px" }}>Prix Unitaire</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "right", width: "100px" }}>Prix Total</th>
                      <th style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textTransform: "uppercase", textAlign: "center", width: "80px" }}>Date d'entrée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProtocolForFiche.beneficiaires?.map((bItem, bIdx) => (
                      <tr key={bIdx}>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "center" }}>{bIdx + 1}</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", fontWeight: "bold" }}>{bItem.nom}</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px" }}>{bItem.telephone || "Non spécifié"}</td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "0", fontSize: "10px" }}>
                          {bItem.produits?.map((p, pIdx) => (
                            <div key={pIdx} style={{ padding: "6px 8px", borderBottom: pIdx < (bItem.produits.length - 1) ? "1px solid #cbd5e1" : "0" }}>
                              {p.produit_nom}
                            </div>
                          ))}
                        </td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "0", fontSize: "10px", textAlign: "center" }}>
                          {bItem.produits?.map((p, pIdx) => (
                            <div key={pIdx} style={{ padding: "6px 8px", borderBottom: pIdx < (bItem.produits.length - 1) ? "1px solid #cbd5e1" : "0" }}>
                              {p.quantite}
                            </div>
                          ))}
                        </td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "0", fontSize: "10px", textAlign: "right" }}>
                          {bItem.produits?.map((p, pIdx) => (
                            <div key={pIdx} style={{ padding: "6px 8px", borderBottom: pIdx < (bItem.produits.length - 1) ? "1px solid #cbd5e1" : "0" }}>
                              {p.prix_unitaire.toFixed(2)} {p.devise || "USD"}
                            </div>
                          ))}
                        </td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "0", fontSize: "10px", textAlign: "right", fontWeight: "bold" }}>
                          {bItem.produits?.map((p, pIdx) => (
                            <div key={pIdx} style={{ padding: "6px 8px", borderBottom: pIdx < (bItem.produits.length - 1) ? "1px solid #cbd5e1" : "0" }}>
                              {(p.prix_unitaire * p.quantite).toFixed(2)} {p.devise || "USD"}
                            </div>
                          ))}
                        </td>
                        <td style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "center" }}>
                          {bItem.date_entree || selectedProtocolForFiche.date_creation}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f1f5f9" }}>
                      <td colSpan={6} style={{ border: "1px solid #cbd5e1", padding: "10px", fontSize: "11px", textAlign: "right", textTransform: "uppercase" }}>PRIX TOTAL CUMULÉ DU PROTOCOLE :</td>
                      <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "10px", fontSize: "11px", textAlign: "right", color: "#059669", fontWeight: "900" }}>
                        {selectedProtocolForFiche.montant_du_usd?.toFixed(2)} USD <br/>
                        <span style={{ fontSize: "10px", color: "#475569" }}>≈ {selectedProtocolForFiche.montant_du_cdf?.toLocaleString()} CDF</span>
                      </td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                      <td colSpan={6} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>TOTAL DES ACOMPTES PAYÉS :</td>
                      <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#16a34a" }}>
                        {selectedProtocolForFiche.montant_paye_usd?.toFixed(2)} USD <br/>
                        <span style={{ fontSize: "9px" }}>≈ {selectedProtocolForFiche.montant_paye_cdf?.toLocaleString()} CDF</span>
                      </td>
                    </tr>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#fff" }}>
                      <td colSpan={6} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right" }}>SOLDE RESTANT DÛ :</td>
                      <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "8px", fontSize: "10px", textAlign: "right", color: "#dc2626" }}>
                        {(selectedProtocolForFiche.montant_du_usd - selectedProtocolForFiche.montant_paye_usd).toFixed(2)} USD <br/>
                        <span style={{ fontSize: "9px" }}>≈ {(selectedProtocolForFiche.montant_du_cdf - selectedProtocolForFiche.montant_paye_cdf).toLocaleString()} CDF</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="signatures" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "30px", fontSize: "10px" }}>
                  <div className="sig-box" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px", textAlign: "center", height: "50px" }}>
                    Pour l'Institution Cliente (Bénéficiaire)
                  </div>
                  <div className="sig-box" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px", textAlign: "center", height: "50px" }}>
                    Pour l'Établissement ETS LUMIÈRE DU CIEL (Direction)
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex justify-end gap-3 pt-4 border-t">
              <button onClick={handleClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md">Fermer</button>
              <button id="btn-print-fiche" onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium flex items-center gap-2">🖨️ Imprimer la Fiche</button>
              <button id="btn-download-pdf" onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium flex items-center gap-2">📥 Télécharger PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Declarer les utilisateurs en local pour l'affichage de l'Admin
const localUsersTemplateForDisplay = [
  { id: "u-admin", name: "Justin Ciza (Admin)", email: "admin@stoppaludisme.cd", role: "admin" as const },
  { id: "u-vendeur", name: "Bahati Murhula (Vendeur)", email: "vendeur@stoppaludisme.cd", role: "vendeur" as const },
  { id: "u-distrib", name: "Kavira Masika (Distributeur)", email: "distributeur@stoppaludisme.cd", role: "distributeur" as const },
  { id: "u-stock", name: "Leopold Mushamuka (Stock & Caisse)", email: "stock@stoppaludisme.cd", role: "stock_caissier" as const },
  { id: "u-caissier", name: "Florence Nabintu (Stock & Caisse)", email: "caissier@stoppaludisme.cd", role: "stock_caissier" as const }
];
