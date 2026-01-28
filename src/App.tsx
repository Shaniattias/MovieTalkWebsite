import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import CreatePost from "./pages/CreatePost";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PostDetails from "./pages/PostDetails";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Comments from "./pages/Comments";



function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <Navigate to="/home" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Protected> <Profile /> </Protected>}/>
        <Route path="/create" element={<Protected><CreatePost /></Protected> }/>
        <Route path="/post/:id"element={<Protected><PostDetails /></Protected> }/>
        <Route path="/post/:id/comments" element={<Protected><Comments/></Protected>} />



        <Route path="/home" element={<Protected> <Home /></Protected> }/>
      </Routes>
    </BrowserRouter>
  );
}
