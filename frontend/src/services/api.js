let topics = [
  {
    temaID: 1,
    naslov: "Implementacija blockchain sistema",
    opis: "Razmatranje implementacije blockchain tehnologije za sigurno glasanje",
    status: "Objavljena",
    grupaID: 1,
    datumKreiranja: new Date("2024-01-10")
  },
  {
    temaID: 2,
    naslov: "Unapređenje korisničkog interfejsa",
    opis: "Poboljšanje UX/UI dizajna aplikacije za glasanje",
    status: "ČekaOdobrenje",
    grupaID: 1,
    datumKreiranja: new Date("2024-01-15")
  },
  {
    temaID: 3,
    naslov: "Proširenje funkcionalnosti admin panela",
    opis: "Dodavanje novih opcija za administraciju sistema",
    status: "Objavljena",
    grupaID: 2,
    datumKreiranja: new Date("2024-01-12")
  },
  {
    temaID: 4,
    naslov: "Završena tema grupe 1",
    opis: "Ova tema je završena i pripada grupi 1",
    status: "Završeno",
    grupaID: 1,
    datumKreiranja: new Date("2024-01-05")
  },
  {
    temaID: 5,
    naslov: "Završena tema grupe 2", 
    opis: "Ova tema je završena i pripada grupi 2",
    status: "Završeno",
    grupaID: 2,
    datumKreiranja: new Date("2024-01-06")
  }
];

let votes = [
  { temaID: 1, odluka: "DA", walletAddress: "0xUSER123", datumGlasanja: new Date("2024-01-11") },
  { temaID: 1, odluka: "NE", walletAddress: "0xUSER456", datumGlasanja: new Date("2024-01-11") },
  { temaID: 3, odluka: "DA", walletAddress: "0xUSER789", datumGlasanja: new Date("2024-01-13") },
  { temaID: 4, odluka: "DA", walletAddress: "0xUSER1", datumGlasanja: new Date() },
  { temaID: 4, odluka: "NE", walletAddress: "0xUSER2", datumGlasanja: new Date() },
  { temaID: 5, odluka: "DA", walletAddress: "0xUSER3", datumGlasanja: new Date() }
];

export const getActiveTopics = async () => {
  return topics.filter((t) => t.status === "Objavljena");
};

export const proposeTopic = async (topicData) => {
  const newTemaID = topics.length + 1;
  topics.push({
    temaID: newTemaID,
    naslov: topicData.naslov,
    opis: topicData.opis,
    status: "ČekaOdobrenje",
    grupaID: topicData.grupaID,
    datumKreiranja: new Date(),
  });
};

export const vote = async (temaID, odluka, walletAddress) => {
  votes.push({ temaID, odluka, walletAddress, datumGlasanja: new Date() });
};

export const getVotesHistory = async (grupaID = null) => {
  let filteredTopics = topics.filter((t) => t.status === "Završeno");
  
  if (grupaID) {
    filteredTopics = filteredTopics.filter(t => t.grupaID === grupaID);
  }
  
  return filteredTopics.map((tema) => {
    const temaVotes = votes.filter((v) => v.temaID === tema.temaID);
    const da = temaVotes.filter((v) => v.odluka === "DA").length;
    const ne = temaVotes.filter((v) => v.odluka === "NE").length;
    const uzdrzano = temaVotes.filter((v) => v.odluka === "UZDRŽANO").length;

    let decision = "UZDRŽANO";
    if (da > ne) decision = "PRIHVAĆENO";
    else if (ne > da) decision = "ODBIJENO";

    return {
      tema: tema.naslov,
      da,
      ne,
      uzdrzano,
      decision,
      ukupno: da + ne + uzdrzano
    };
  });
};

export const getAllTopics = async () => {
  return [...topics];
};

export const approveTopic = async (temaID) => {
  const tema = topics.find(t => t.temaID === temaID);
  if (tema) {
    tema.status = "Objavljena";
  }
};

export const rejectTopic = async (temaID) => {
  const tema = topics.find(t => t.temaID === temaID);
  if (tema) {
    tema.status = "Odbijena";
  }
};

export const finishTopic = async (temaID) => {
  const tema = topics.find(t => t.temaID === temaID);
  if (tema) {
    tema.status = "Završeno";
  }
};