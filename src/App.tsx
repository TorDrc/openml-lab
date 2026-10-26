import { LabProvider } from './components/LabContext';
import { Layout } from './components/Layout';
import About from './pages/About';
import Datasets from './pages/Datasets';
import Home from './pages/Home';
import Lab from './pages/Lab';
import Learn from './pages/Learn';
import Train from './pages/Train';
import { useRoute } from './utils/router';

function Page() {
  const route = useRoute();
  switch (route) {
    case '/lab':
      return <Lab />;
    case '/datasets':
      return <Datasets />;
    case '/train':
      return <Train />;
    case '/learn':
      return <Learn />;
    case '/about':
      return <About />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <LabProvider>
      <Layout>
        <Page />
      </Layout>
    </LabProvider>
  );
}
