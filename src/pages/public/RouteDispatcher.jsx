import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import { Spinner } from 'reactstrap';

// End-User Public Components
import MenuPreview from '../restaurant_menu/MenuPreview';
import PublicCard from '../personal_qr/PublicCard';

const RouteDispatcher = () => {
  const { token } = useParams();
  const [serviceType, setServiceType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkToken = async () => {
      try {
        setLoading(true);
        // Identify which service this token belongs to from live backend
        const type = await publicService.identifyToken(token);
        setServiceType(type);
      } catch (err) {
        setError(err.message || 'Link not found or invalid.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      checkToken();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light text-center p-4">
        <div className="bg-white p-5 rounded-4 shadow-sm">
          <h2 className="text-danger fw-bold mb-2">Page Not Found</h2>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  // Render the correct service component based on what the backend identified
  switch (serviceType) {
    case 'personal_qr':
      return <PublicCard token={token} />;
    case 'restaurant_menu':
      return <MenuPreview token={token} />;
    // Future services can simply be added as cases here!
    default:
      return <div>Service not recognized.</div>;
  }
};

export default RouteDispatcher;
