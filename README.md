# VotingDapp 

## Projekat

Projekat predstavlja decentralizovanu aplikaciju koja obezbedjuje sigurno i transparentno ucesce u glasanju. 

Korisnik moze da napravi grupu i postane admin grupe kao admin on odobrava teme glasanja i ubacuje ostale korisnike glasace. 

Korisnici mogu pristupiti napravljenoj grupi putem jedinstvene sifre a postaju glasaci samo ukoliko admin grupe potpise tu transakciju. 

Backend je u Pythonu (FastAPI), frontend u JavaScript-u (React), baza je PostgreSQL i contract je u Solidity-u. 

Za potrebe testiranja projekat koristi Sepolia test network. Projekat za IPFS bazu koristi pinata cloud.

Za citanje transakcija sa blockchaina projekat koristi Infura RPC URL dobijen od njihovo API KEY-a. 


## Pokretanje projekta

Kako bih pokrenuli projekat morate napraviti i popuniti .env file po uzoru na .env.template, 

Projekat je dockerizovan i moze se pokrenuti komandom:

```bash
sudo docker compose up --build
```

# VotingDapp

## Project

This project is a decentralized application that enables secure and transparent participation in voting.

A user can create a group and become its admin. As an admin, the user approves voting topics and adds other users as voters.

Users can join an existing group using a unique code, but they become voters only after the group admin signs the transaction approving their participation.

The backend is written in Python using FastAPI, the frontend is built with JavaScript using React, the database is PostgreSQL, and the smart contract is written in Solidity.

For testing purposes, the project uses the Sepolia test network.

The project uses Pinata Cloud for IPFS storage.

To read blockchain transactions, the project uses an Infura RPC URL obtained via their API key.

## Running the Project

To run the project, you must create and populate a `.env` file based on the `.env.template` example.

The project is dockerized and can be started with the following command:

```bash
sudo docker compose up --build
