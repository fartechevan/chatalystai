import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'your-project-id', // You'll need to provide this
  credentials: {
    client_email: import.meta.env.VITE_GOOGLE_CLIENT_EMAIL,
    private_key: import.meta.env.VITE_GOOGLE_PRIVATE_KEY,
  },
});

export const fetchBlueIceLogs = async () => {
  const query = `
    SELECT 
      incoming,
      response
    FROM \`your-project.your-dataset.blue_ice_data_logs\`
  `;

  try {
    const [rows] = await bigquery.query({ query });
    return rows;
  } catch (error) {
    console.error('Error querying BigQuery:', error);
    throw error;
  }
};