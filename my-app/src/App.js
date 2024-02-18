import './App.css';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import SignupPage from './pages/Signup';
import LoginPage from './pages/Login';
import HomePage from './pages/HomePage';
import UploadPage from './pages/Upload';
import DrawPage from './pages/Draw';

function App() {
  return (
    <div className="min-h-full h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
     <BrowserRouter>
        <Routes>
            <Route path="/" element={<LoginPage/>} />
            <Route path="/signup" element={<SignupPage/>} />
            <Route path="/home" element={<HomePage/>} />
            <Route path="/upload" element={<UploadPage/>} />
            <Route path="/draw" element={<DrawPage/>} />
        </Routes>
      </BrowserRouter>
    </div>
  </div>
  );
}

export default App;