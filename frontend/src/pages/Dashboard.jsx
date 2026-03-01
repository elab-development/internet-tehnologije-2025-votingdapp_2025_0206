import { useEffect, useMemo, useState } from "react";
import Web3 from "web3";
import { getMyGroups, getTopics, updateTopicStatus } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { connectWallet } from "../services/web3";
import {
  addMemberToGroup,
  createTopic as createTopicOnChain,
  removeMemberFromGroup,
} from "../services/contractServise";
import { uploadTopicMetadata } from "../services/ipfsService";

function Dashboard() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [managedGroups, setManagedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingTopicId, setApprovingTopicId] = useState(null);
  const [memberAddress, setMemberAddress] = useState("");
  const [selectedGroupAddress, setSelectedGroupAddress] = useState("");
  const [memberActionLoading, setMemberActionLoading] = useState(null);
  const [message, setMessage] = useState("");

  const loadTopics = async () => {
    try {
      const data = await getTopics();
      const sorted = data.sort((a, b) => {
        const order = { pending: 1, active: 2, closed: 3 };
        return order[a.status] - order[b.status];
      });
      setTopics(sorted);
    } catch (error) {
      console.error("Greška pri učitavanju tema:", error);
    }
  };

  const loadManagedGroups = async () => {
    try {
      const data = await getMyGroups();
      setManagedGroups(data || []);
    } catch (error) {
      console.error("Greška pri učitavanju grupa:", error);
      setManagedGroups([]);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([loadTopics(), loadManagedGroups()]);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  const groupOptions = useMemo(() => {
    const groupsByAddress = new Map();

    managedGroups.forEach((group) => {
      if (!group?.contract_address) return;
      const key = group.contract_address.toLowerCase();
      groupsByAddress.set(key, {
        address: group.contract_address,
        name: group.name || `Grupa #${group.id}`,
      });
    });

    topics.forEach((topic) => {
      if (!topic?.contract_address) return;
      const key = topic.contract_address.toLowerCase();
      if (!groupsByAddress.has(key)) {
        groupsByAddress.set(key, {
          address: topic.contract_address,
          name: `Grupa #${topic.group_id}`,
        });
      }
    });

    return Array.from(groupsByAddress.values());
  }, [managedGroups, topics]);

  useEffect(() => {
    if (groupOptions.length === 0) {
      if (selectedGroupAddress) setSelectedGroupAddress("");
      return;
    }

    const exists = groupOptions.some(
      (group) =>
        group.address.toLowerCase() === selectedGroupAddress.toLowerCase()
    );

    if (!selectedGroupAddress || !exists) {
      setSelectedGroupAddress(groupOptions[0].address);
    }
  }, [groupOptions, selectedGroupAddress]);

  const getValidatedAdminAccount = async () => {
    const account = await connectWallet();
    if (!account) {
      throw new Error("MetaMask nalog nije povezan");
    }

    const loggedWallet = user?.walletAddress?.toLowerCase();
    if (loggedWallet && loggedWallet !== account.toLowerCase()) {
      throw new Error("Poveži isti MetaMask nalog kojim si ulogovan kao admin");
    }

    return account;
  };

  const handleApprove = async (topic) => {
    if (!window.confirm("Da li ste sigurni da želite da odobrite ovu temu?")) return;
    if (!topic.contract_address) {
      alert("Tema nema adresu grupnog ugovora. Proveri da li je grupa povezana sa blockchain ugovorom.");
      return;
    }

    try {
      setApprovingTopicId(topic.id);
      setMessage("");

      const account = await getValidatedAdminAccount();

      const token = sessionStorage.getItem("voting_token");
      if (!token) {
        throw new Error("Nedostaje sesija. Prijavi se ponovo.");
      }

      const ipfsHash = await uploadTopicMetadata(
        {
          title: topic.title || `Tema #${topic.id}`,
          description: topic.description || "",
        },
        token
      );

      const { txHash, topicId } = await createTopicOnChain(
        topic.contract_address,
        ipfsHash,
        account
      );

      await updateTopicStatus(topic.id, "active", {
        on_chain_topic_id: Number.isInteger(topicId) ? topicId : null,
        contract_address: topic.contract_address,
        ipfs_hash: ipfsHash,
      });

      setMessage(`Tema odobrena on-chain. Tx: ${txHash?.slice(0, 12)}...`);
      await loadTopics();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Nepoznata greška";
      alert("Greška: " + detail);
      setMessage(`Greška: ${detail}`);
    } finally {
      setApprovingTopicId(null);
    }
  };

  const handleFinish = async (temaID) => {
    if (!window.confirm("Završiti glasanje za ovu temu?")) return;
    try {
      await updateTopicStatus(temaID, "closed");
      await loadTopics();
    } catch (err) {
      alert("Greška: " + err.response?.data?.detail);
    }
  };

  const handleMemberAction = async (action) => {
    const trimmedMemberAddress = memberAddress.trim();
    if (!Web3.utils.isAddress(trimmedMemberAddress)) {
      setMessage("Unesi validnu Ethereum adresu člana.");
      return;
    }

    const groupAddress = selectedGroupAddress || groupOptions[0]?.address;
    if (!groupAddress || !Web3.utils.isAddress(groupAddress)) {
      setMessage("Nije dostupna validna adresa grupnog ugovora.");
      return;
    }

    const memberChecksumAddress = Web3.utils.toChecksumAddress(trimmedMemberAddress);
    const groupChecksumAddress = Web3.utils.toChecksumAddress(groupAddress);
    const isAdd = action === "add";

    const confirmText = isAdd
      ? `Dodati člana ${memberChecksumAddress} u grupu?`
      : `Ukloniti člana ${memberChecksumAddress} iz grupe?`;

    if (!window.confirm(confirmText)) return;

    try {
      setMemberActionLoading(action);
      setMessage("");

      const account = await getValidatedAdminAccount();
      const txResult = isAdd
        ? await addMemberToGroup(groupChecksumAddress, memberChecksumAddress, account)
        : await removeMemberFromGroup(groupChecksumAddress, memberChecksumAddress, account);

      setMessage(
        `${isAdd ? "Član dodat" : "Član uklonjen"} on-chain. Tx: ${txResult?.txHash?.slice(0, 12)}...`
      );
      setMemberAddress("");
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Nepoznata greška";
      alert("Greška: " + detail);
      setMessage(`Greška: ${detail}`);
    } finally {
      setMemberActionLoading(null);
    }
  };

  const isMemberActionDisabled = groupOptions.length === 0 || !memberAddress.trim();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Admin Dashboard</h2>
      {message && (
        <div className="max-w-4xl mx-auto mb-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">Upravljanje Članovima</h3>
          <p className="text-xs text-gray-500 mt-1">
            Unesi wallet adresu člana i pošalji transakciju na ugovor.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {groupOptions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupa</label>
              <select
                value={selectedGroupAddress}
                onChange={(e) => setSelectedGroupAddress(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {groupOptions.map((group) => (
                  <option key={group.address} value={group.address}>
                    {group.name} ({group.address.slice(0, 10)}...)
                  </option>
                ))}
              </select>
            </div>
          )}

          {groupOptions.length === 1 && (
            <p className="text-sm text-gray-600">
              Aktivna grupa:{" "}
              <span className="font-mono">
                {groupOptions[0].name}
              </span>
            </p>
          )}

          {groupOptions.length === 0 && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded p-2">
              Nema dostupne adrese grupnog ugovora. Kreiraj grupu ili sačekaj blockchain sync.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="0x... adresa člana"
              value={memberAddress}
              onChange={(e) => setMemberAddress(e.target.value)}
              className="md:col-span-2 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMemberAction("add")}
                disabled={isMemberActionDisabled || memberActionLoading !== null}
                className={`flex-1 text-white py-2 rounded text-sm transition ${
                  isMemberActionDisabled || memberActionLoading !== null
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {memberActionLoading === "add" ? "Dodajem..." : "Dodaj člana"}
              </button>
              <button
                type="button"
                onClick={() => handleMemberAction("remove")}
                disabled={isMemberActionDisabled || memberActionLoading !== null}
                className={`flex-1 text-white py-2 rounded text-sm transition ${
                  isMemberActionDisabled || memberActionLoading !== null
                    ? "bg-red-300 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {memberActionLoading === "remove" ? "Uklanjam..." : "Ukloni člana"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow mt-6 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">Upravljanje Temama</h3>
        </div>

        {loading ? (
          <p className="p-6 text-center">Učitavanje...</p>
        ) : topics.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nema tema za prikaz.</p>
        ) : (
          <div>
            <div className="grid grid-cols-12 px-6 py-3 border-b bg-gray-100 font-semibold text-sm text-gray-600">
              <div className="col-span-1">ID</div>
              <div className="col-span-5">Naslov Teme</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-4 text-right">Akcije</div>
            </div>

            {topics.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-12 items-center px-6 py-4 border-b last:border-b-0 hover:bg-gray-50"
              >
                <div className="col-span-1 text-gray-500">#{t.id}</div>
                <div className="col-span-5 font-medium text-gray-800">
                  {t.title}
                  <p className="text-xs text-gray-500 font-normal">{t.description}</p>
                  {t.results && (
                    <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-green-600">ZA: {t.results.yes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-red-600">PROTIV: {t.results.no}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span className="text-gray-500">UZDRŽANO: {t.results.abstain}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-2 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      t.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : t.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {t.status.toUpperCase()}
                  </span>
                </div>

                <div className="col-span-4 flex justify-end gap-2">
                  {t.status === "pending" && (
                    <button
                      onClick={() => handleApprove(t)}
                      disabled={approvingTopicId === t.id}
                      className={`text-white px-3 py-1 rounded text-sm transition ${
                        approvingTopicId === t.id
                          ? "bg-green-300 cursor-not-allowed"
                          : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {approvingTopicId === t.id ? "Odobravam..." : "Odobri"}
                    </button>
                  )}

                  {t.status === "active" && (
                    <button
                      onClick={() => handleFinish(t.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      Završi Glasanje
                    </button>
                  )}

                  {t.status === "closed" && (
                    <span className="text-gray-400 text-sm italic">Arhivirano</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
