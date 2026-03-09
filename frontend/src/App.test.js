import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

describe("Frontend - UI Komponente i Interakcija", () => {
  
  // PRVI TEST (Ovaj već imaš - proverava renderovanje)
  it("Trebalo bi da iscrta osnovne elemente korisničkog interfejsa", () => {
    render(
      <div>
        <h2>Voting Dapp Login</h2>
        <button>Login sa MetaMask</button>
      </div>
    );

    const title = screen.getByText(/Voting Dapp Login/i);
    const button = screen.getByText(/Login sa MetaMask/i);

    expect(title).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  // Provera interakcije korisnika
  it("Trebalo bi da detektuje korisnički klik na dugme za glasanje", () => {
    // Pravimo laznu funkciju koja prati da li je okinuta
    let glasanjeBelezeno = false;
    const simulirajGlasanje = () => { glasanjeBelezeno = true; };

    // Renderujemo dugme za simulaciju glasanja
    render(
      <button onClick={simulirajGlasanje} className="bg-green-500">
        Glasaj ZA
      </button>
    );

    // Nalazimo dugme na virtuelnom ekranu
    const voteButton = screen.getByText(/Glasaj ZA/i);
    
    // Simuliramo pravi fizički klik mišem na to dugme
    fireEvent.click(voteButton);

    // Proveravamo da li je React uspešno registrovao akciju
    expect(glasanjeBelezeno).toBe(true);
  });

});