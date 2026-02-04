
// Dobavljanje svih grupa iz localStorage
export const getGroups = () => {
  return JSON.parse(localStorage.getItem("groups")) || [];
};


export const createGroup = (group) => {
  //group = { grupaID, sifraGrupe, datumKreiranja }
  const groups = getGroups();

 
  if (groups.some((g) => g.grupaID === group.grupaID)) {
    throw new Error("Grupa sa ovim ID-om već postoji");
  }

  //dodavanje nove grupe
  groups.push(group);
  localStorage.setItem("groups", JSON.stringify(groups));

  return group;
};


export const getGroupByID = (grupaID) => {
  const groups = getGroups();
  return groups.find((g) => g.grupaID === grupaID) || null;
};


export const deleteGroup = (grupaID) => {
  let groups = getGroups();
  groups = groups.filter((g) => g.grupaID !== grupaID);
  localStorage.setItem("groups", JSON.stringify(groups));
};
