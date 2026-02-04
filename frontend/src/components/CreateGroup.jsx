
import { useState } from "react";
import { createGroup, getGroups } from "../services/groupService";

function CreateGroup() {
  const [grupaID, setGrupaID] = useState("");
  const [sifraGrupe, setSifraGrupe] = useState("");
  const [poruka, setPoruka] = useState("");

  const handleCreate = () => {
    setPoruka(""); 
    
    if (!grupaID || !sifraGrupe) {
      setPoruka("Popuni sva polja");
      return;
    }

    
    const postojeca = getGroups().find(g => g.grupaID === grupaID);
    if (postojeca) {
      setPoruka("Grupa sa ovim ID-om već postoji");
      return;
    }

    
    const newGroup = {
      grupaID: grupaID,
      sifraGrupe: sifraGrupe,
      datumKreiranja: new Date().toISOString(),
    };

    createGroup(newGroup);
    
    
    setPoruka(`Grupa "${grupaID}" kreirana. Šifra: ${sifraGrupe}`);
    
    
    setGrupaID("");
    setSifraGrupe("");
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto mt-6">
      <h3 className="text-xl font-semibold mb-4">Kreiranje nove grupe</h3>

      <input
        className="border w-full p-2 mb-3"
        placeholder="ID grupe"
        value={grupaID}
        onChange={(e) => setGrupaID(e.target.value)}
      />

      <input
        className="border w-full p-2 mb-4"
        placeholder="Šifra grupe"
        value={sifraGrupe}
        onChange={(e) => setSifraGrupe(e.target.value)}
      />

      <button
        onClick={handleCreate}
        className="bg-indigo-600 text-white px-4 py-2 rounded w-full"
      >
        Kreiraj grupu
      </button>

      {poruka && (
        <p className={`mt-3 text-center ${poruka.includes("kreirana") ? "text-green-600" : "text-red-600"}`}>
          {poruka}
        </p>
      )}
    </div>
  );
}

export default CreateGroup;