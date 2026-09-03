export interface BukavuLocation {
  avenue: string;
  quartier: string;
  commune: string;
}

export const BUKAVU_LOCATIONS: BukavuLocation[] = [
  // --- COMMUNE D'IBANDA ---
  // Quartier Panzi
  { avenue: "Avenue Major Vangu", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Bizimana", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Mushunju", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Kasihe", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Ruzizi 1", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Ruzizi 2", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Muhanzi", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Karhanda", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Kazaroho", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Kibungere", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Mulungoke", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Chai", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Hôpital de Panzi", quartier: "Panzi", commune: "Ibanda" },
  { avenue: "Avenue Mushekere", quartier: "Panzi", commune: "Ibanda" },

  // Quartier Ndendere
  { avenue: "Avenue Patrice Emery Lumumba", quartier: "Ndendere", commune: "Ibanda" },
  { avenue: "Avenue Maniema", quartier: "Ndendere", commune: "Ibanda" },
  { avenue: "Avenue de la Résidence", quartier: "Ndendere", commune: "Ibanda" },
  { avenue: "Avenue de la Poste", quartier: "Ndendere", commune: "Ibanda" },
  { avenue: "Avenue du Gouvernement", quartier: "Ndendere", commune: "Ibanda" },

  // Quartier Nyalukemba
  { avenue: "Avenue de la Régideso", quartier: "Nyalukemba", commune: "Ibanda" },
  { avenue: "Avenue Nguba", quartier: "Nyalukemba", commune: "Ibanda" },
  { avenue: "Avenue Val Vallée", quartier: "Nyalukemba", commune: "Ibanda" },
  { avenue: "Avenue du Lac", quartier: "Nyalukemba", commune: "Ibanda" },
  { avenue: "Avenue Muhumba", quartier: "Nyalukemba", commune: "Ibanda" },

  // --- COMMUNE DE KADUTU ---
  { avenue: "Avenue de l'Université", quartier: "Nkafu", commune: "Kadutu" },
  { avenue: "Avenue Kasai", quartier: "Nkafu", commune: "Kadutu" },
  { avenue: "Avenue Buholo 1", quartier: "Kasali", commune: "Kadutu" },
  { avenue: "Avenue Buholo 2", quartier: "Kasali", commune: "Kadutu" },
  { avenue: "Avenue Industrielle", quartier: "Nyakaliba", commune: "Kadutu" },
  { avenue: "Avenue Ciriri", quartier: "Cahi", commune: "Kadutu" },
  { avenue: "Avenue Beach Muhanzi", quartier: "Nkafu", commune: "Kadutu" },

  // --- COMMUNE DE BAGIRA ---
  { avenue: "Avenue Place Communale", quartier: "Lumumba", commune: "Bagira" },
  { avenue: "Avenue Nyakavogo", quartier: "Nyakavogo", commune: "Bagira" },
  { avenue: "Avenue Karhale", quartier: "Mulambula", commune: "Bagira" }
];
