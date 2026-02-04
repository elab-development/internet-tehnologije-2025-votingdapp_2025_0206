import { useState } from "react";

function NewTopicForm({ onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ title, description, status: "na čekanju" });
    setTitle("");
    setDescription("");
    alert("Tema poslata na verifikaciju adminu");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Kreiraj novu temu</h3>
      <input
        type="text"
        placeholder="Naslov"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Opis"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <button type="submit">Pošalji</button>
    </form>
  );
}

export default NewTopicForm;
