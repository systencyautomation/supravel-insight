import { Navigate } from 'react-router-dom';

// Redirect to main dashboard - vendas is now inside Empresa tab
export default function Vendas() {
  return <Navigate to="/" replace />;
}
