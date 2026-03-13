import React from 'react';
import Layout from '../components/Layout';
import UploadFlow from '../components/UploadFlow';

export default function UploadPage() {
  return (
    <Layout title="Dashboard" subtitle="Upload your resume and get a role-specific quiz.">
      <UploadFlow />
    </Layout>
  );
}

