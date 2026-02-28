
const IPFS_GATEWAY_URL = process.env.REACT_APP_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';


export const uploadTopicMetadata = async (data, token) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/ipfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    const result = await response.json();
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
