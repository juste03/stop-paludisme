import { UserRole } from "./types";

export interface KitOption {
  id: string;
  nom: string;
  prix: number;
  devise: "USD" | "CDF";
  description: string;
}

export const KIT_OPTIONS: KitOption[] = [
  { id: "me_std", nom: "Kit Standard (Moustiquaire)", prix: 5.0, devise: "USD", description: "Moustiquaire Électrique Standard" },
  { id: "me_prem", nom: "Kit Premium (Moustiquaire + Support)", prix: 10.0, devise: "USD", description: "Moustiquaire Électrique Premium" },
  { id: "me_pro", nom: "Kit Pro (Usage Intensif)", prix: 20.0, devise: "USD", description: "Moustiquaire Électrique Pro Professionnelle" },
  { id: "c_liq", nom: "Liquide Recharge", prix: 3000.0, devise: "CDF", description: "Recharge Liquide insecticide longue durée" },
  { id: "c_plq", nom: "Plaquette Insecticide", prix: 5000.0, devise: "CDF", description: "Plaquettes insecticides supplémentaires" }
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  vendeur: "Agent Vendeur",
  distributeur: "Agent Distributeur",
  stock_caissier: "STOCK ET CAISSE"
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  vendeur: "bg-emerald-50 text-emerald-700 border-emerald-200",
  distributeur: "bg-blue-50 text-blue-700 border-blue-200",
  stock_caissier: "bg-indigo-50 text-indigo-700 border-indigo-200"
};

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: "Cash / Espèces",
  credit: "Crédit Institutionnel",
  mpesa: "M-Pesa (Vodacom)",
  airtel_money: "Airtel Money",
  orange_money: "Orange Money"
};

export const STYLES = {
  card: "bg-white border border-slate-100 rounded-xl shadow-sm/50 p-5 hover:shadow-md/50 transition-all duration-300",
  input: "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all",
  label: "block text-[10px] font-bold uppercase text-slate-500 mb-1",
  btnPrimary: "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50",
  btnSecondary: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
  tableTh: "px-4 py-3 text-left text-[10px] font-bold uppercase text-slate-500 tracking-wider",
  tableTd: "px-4 py-3 whitespace-nowrap text-xs text-slate-700 border-t border-slate-100",
  badgePending: "px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200",
  badgeSuccess: "px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200",
  badgeDanger: "px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200"
};
