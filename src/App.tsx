import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { CheckInListener } from './components/CheckInListener';
import { WaitlistFulfillmentListener } from './components/WaitlistFulfillmentListener';

export default function App() {
  return (
    <AuthProvider>
      <CheckInListener />
      <WaitlistFulfillmentListener />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}