import { Layout } from 'antd';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Features from './pages/Features';
import SDK from './pages/SDK';
import Docs from './pages/Docs';
import Download from './pages/Download';

const { Content } = Layout;

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header />
        <Content style={{ padding: 0 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/sdk" element={<SDK />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/download" element={<Download />} />
          </Routes>
        </Content>
        <Footer />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
