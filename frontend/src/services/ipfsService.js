const API_URL = process.env.REACT_APP_API_URL;
const IPFS_GATEWAY_URL = process.env.REACT_APP_IPFS_GATEWAY_URL;

if (!API_URL) {
  throw new Error("REACT_APP_API_URL is not configured");
}
if (!IPFS_GATEWAY_URL) {
  throw new Error("REACT_APP_IPFS_GATEWAY_URL is not configured");
}


export const uploadTopicMetadata = async (data, token) => {
  try {
    const authToken = token || sessionStorage.getItem("voting_token");
    const response = await fetch(`${API_URL}/ipfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const fallback = "Failed to upload metadata to IPFS";
      const clone = response.clone();
      try {
        const errorJson = await response.json();
        throw new Error(errorJson?.detail || fallback);
      } catch {
        const errorText = await clone.text();
        throw new Error(errorText || fallback);
      }
    }

    const result = await response.json();
    if (!result?.ipfs_hash) {
      throw new Error("Backend did not return ipfs_hash");
    }
    return result.ipfs_hash;
  } catch (error) {
    console.error('Error uploading metadata:', error);
    throw error;
  }
};


export const getTopicMetadata = async (ipfsHash) => {
  try {
    const url = `${IPFS_GATEWAY_URL}${ipfsHash}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to retrieve metadata from IPFS');
    }

    return await response.json();
  } catch (error) {
    console.error('Error retrieving metadata:', error);
    throw error;
  }
};


export const getIPFSUrl = (ipfsHash) => {
  return `${IPFS_GATEWAY_URL}${ipfsHash}`;
};

const ipsfService = {
  uploadTopicMetadata,
  getTopicMetadata,
  getIPFSUrl
};
export default ipsfService;
