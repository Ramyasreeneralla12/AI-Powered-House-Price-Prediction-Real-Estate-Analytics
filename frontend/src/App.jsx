import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  useAuth, 
  AuthProvider, 
  API_URL 
} from './context/AuthContext';
import MapSelector from './components/MapSelector';
import AnalyticsCharts from './components/AnalyticsCharts';
import { 
  MapPin, 
  TrendingUp, 
  Activity, 
  FileText, 
  Sliders, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Heart, 
  Plus, 
  Eye, 
  Trash2, 
  Upload, 
  RefreshCw, 
  BarChart2, 
  Download,
  AlertTriangle,
  CheckCircle,
  Building,
  Image as ImageIcon
} from 'lucide-react';

const CITIES_DATA = {
  bangalore: {
    name: 'Bangalore',
    center: [12.9716, 77.5946],
    areas: [
      { name: 'Indiranagar', coords: [12.9784, 77.6408] },
      { name: 'Koramangala', coords: [12.9352, 77.6244] },
      { name: 'Whitefield', coords: [12.9698, 77.7500] },
      { name: 'Jayanagar', coords: [12.9308, 77.5838] },
      { name: 'Electronic City', coords: [12.8452, 77.6602] },
      { name: 'HSR Layout', coords: [12.9105, 77.6450] },
      { name: 'Marathahalli', coords: [12.9561, 77.6983] }
    ]
  },
  mumbai: {
    name: 'Mumbai',
    center: [19.0760, 72.8777],
    areas: [
      { name: 'Bandra', coords: [19.0596, 72.8295] },
      { name: 'Andheri', coords: [19.1136, 72.8697] },
      { name: 'Colaba', coords: [18.9067, 72.8147] },
      { name: 'Juhu', coords: [19.1026, 72.8270] },
      { name: 'Worli', coords: [19.0178, 72.8173] },
      { name: 'Borivali', coords: [19.2307, 72.8567] },
      { name: 'Powai', coords: [19.1176, 72.9060] }
    ]
  },
  delhi: {
    name: 'Delhi',
    center: [28.6139, 77.2090],
    areas: [
      { name: 'Connaught Place', coords: [28.6304, 77.2177] },
      { name: 'Greater Kailash', coords: [28.5482, 77.2344] },
      { name: 'Vasant Kunj', coords: [28.5387, 77.1608] },
      { name: 'Karol Bagh', coords: [28.6514, 77.1903] },
      { name: 'Dwarka', coords: [28.5857, 77.0496] },
      { name: 'Saket', coords: [28.5244, 77.2104] },
      { name: 'Hauz Khas', coords: [28.5495, 77.2036] }
    ]
  },
  chennai: {
    name: 'Chennai',
    center: [13.0827, 80.2707],
    areas: [
      { name: 'Adyar', coords: [13.0033, 80.2550] },
      { name: 'Anna Nagar', coords: [13.0850, 80.2101] },
      { name: 'T. Nagar', coords: [13.0418, 80.2337] },
      { name: 'Mylapore', coords: [13.0333, 80.2686] },
      { name: 'Velachery', coords: [12.9774, 80.2190] },
      { name: 'Nungambakkam', coords: [13.0589, 80.2429] },
      { name: 'OMR Sholinganallur', coords: [12.9010, 80.2279] }
    ]
  },
  hyderabad: {
    name: 'Hyderabad',
    center: [17.3850, 78.4867],
    areas: [
      { name: 'Gachibowli', coords: [17.4401, 78.3489] },
      { name: 'Jubilee Hills', coords: [17.4325, 78.4071] },
      { name: 'Banjara Hills', coords: [17.4176, 78.4350] },
      { name: 'Hitech City', coords: [17.4504, 78.3808] },
      { name: 'Madhapur', coords: [17.4483, 78.3915] },
      { name: 'Kukatapally', coords: [17.4855, 78.4062] },
      { name: 'Secunderabad', coords: [17.4399, 78.4983] }
    ]
  }
};

// Wrap App component in AuthProvider
export default function SafeApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
  const { user, token, loading, login, register, logout, updateProfile } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('landing');
  
  // Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Predictor Form State
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [selectedCityKey, setSelectedCityKey] = useState('bangalore');
  const [selectedAreaKey, setSelectedAreaKey] = useState('Indiranagar');
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const [areaSqft, setAreaSqft] = useState(1200);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  const [floors, setFloors] = useState(1);
  const [houseAge, setHouseAge] = useState(5);
  const [parking, setParking] = useState(true);
  const [balconies, setBalconies] = useState(1);
  const [furnishing, setFurnishing] = useState('SEMI_FURNISHED');
  const [propertyType, setPropertyType] = useState('APARTMENT');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Prediction Output State
  const [predictionResult, setPredictionResult] = useState(null);
  const [predicting, setPredicting] = useState(false);
  
  // Dashboard Map States
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Predictions Log & Favorites lists
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  // Compare list
  const [compareIds, setCompareIds] = useState([]);
  const [compareResults, setCompareResults] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  // Admin Dashboard States
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [adminCsvFile, setAdminCsvFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');

  // Auto redirect / navigate on login state change
  useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
      fetchUserData();
      
      // Setup periodic polling for notifications (every 8 seconds)
      const interval = setInterval(() => {
        fetchNotifications();
      }, 8000);
      return () => clearInterval(interval);
    } else {
      setActiveTab('landing');
      setPredictionHistory([]);
      setFavorites([]);
      setNotifications([]);
    }
  }, [user]);

  // Fetch all initial data needed
  const fetchUserData = async () => {
    try {
      fetchHistory();
      fetchFavorites();
      fetchNotifications();
      fetchHeatmapPoints();
      if (user?.role === 'ADMIN') {
        fetchAdminData();
      }
    } catch (e) {
      console.log('Error fetching user data', e);
    }
  };

  const fetchHistory = async () => {
    const res = await axios.get(`${API_URL}/predictions/`);
    setPredictionHistory(res.data);
  };

  const fetchFavorites = async () => {
    const res = await axios.get(`${API_URL}/favorites/`);
    setFavorites(res.data);
  };

  const fetchNotifications = async () => {
    const res = await axios.get(`${API_URL}/notifications/`);
    setNotifications(res.data);
  };

  const fetchHeatmapPoints = async () => {
    // Admin stats endpoint returns heatmap coordinates
    // We can fetch from stats or mock some points if regular user
    try {
      const res = await axios.get(`${API_URL}/admin/stats/`);
      setHeatmapPoints(res.data.heat_points || []);
      setAdminStats(res.data);
    } catch (e) {
      // Create mock heatmap points around center if stats is blocked
      const mockPoints = [];
      for (let i = 0; i < 40; i++) {
        mockPoints.push({
          lat: 12.9716 + (Math.random() - 0.5) * 0.15,
          lng: 77.5946 + (Math.random() - 0.5) * 0.15,
          price: 30 + Math.random() * 200
        });
      }
      setHeatmapPoints(mockPoints);
    }
  };

  const fetchAdminData = async () => {
    try {
      const uRes = await axios.get(`${API_URL}/admin/users/`);
      setAdminUsers(uRes.data);
    } catch (e) {
      console.log('Failed to fetch admin user list', e);
    }
  };

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authSubmitting) return;
    setAuthSubmitting(true);
    setAuthError('');
    setAuthSuccess('');
    
    try {
      if (authMode === 'login') {
        const res = await login(username, password);
        if (res.success) {
          setShowAuthModal(false);
        } else {
          setAuthError(res.error);
        }
      } else {
        const res = await register(username, email, password, confirmPassword, fullName);
        if (res.success) {
          setAuthSuccess('Registration successful! Please login.');
          setAuthMode('login');
          setPassword('');
        } else {
          setAuthError(res.error);
        }
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLocationSelect = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setIsLocationSelected(true); // Evaporate map!
  };

  const handleCityChange = (cityKey) => {
    setSelectedCityKey(cityKey);
    const city = CITIES_DATA[cityKey];
    setLatitude(city.center[0]);
    setLongitude(city.center[1]);
    setSelectedAreaKey(city.areas[0].name);
    setIsLocationSelected(false); // Display map centered on new city
  };

  const handleAreaChange = (areaName) => {
    setSelectedAreaKey(areaName);
    const area = CITIES_DATA[selectedCityKey].areas.find(a => a.name === areaName);
    if (area) {
      setLatitude(area.coords[0]);
      setLongitude(area.coords[1]);
    }
    setIsLocationSelected(true); // Evaporate map!
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredictSubmit = async (e) => {
    e.preventDefault();
    setPredicting(true);
    setPredictionResult(null);

    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('area_sqft', areaSqft);
    formData.append('bedrooms', bedrooms);
    formData.append('bathrooms', bathrooms);
    formData.append('floors', floors);
    formData.append('house_age', houseAge);
    formData.append('parking_available', parking);
    formData.append('balcony_count', balconies);
    formData.append('furnishing_status', furnishing);
    formData.append('property_type', propertyType);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      // API call to predictions
      const res = await axios.post(`${API_URL}/predictions/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      setPredictionResult(res.data);
      fetchHistory(); // refresh logs
    } catch (err) {
      console.log('Prediction failed', err);
      alert('Valuation prediction failed. Check inputs.');
    } finally {
      setPredicting(false);
    }
  };

  const toggleFavorite = async (predictionId) => {
    const fav = favorites.find(f => f.prediction === predictionId);
    try {
      if (fav) {
        await axios.delete(`${API_URL}/favorites/${fav.id}/`);
      } else {
        await axios.post(`${API_URL}/favorites/`, { prediction: predictionId });
      }
      fetchFavorites();
      fetchHistory();
    } catch (e) {
      console.log('Favorite toggle failed', e);
    }
  };

  const deletePrediction = async (id) => {
    if (confirm('Delete this valuation record?')) {
      await axios.delete(`${API_URL}/predictions/${id}/`);
      fetchHistory();
      fetchFavorites();
    }
  };

  const handleCompareCheckbox = (id) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(x => x !== id));
    } else {
      if (compareIds.length >= 3) {
        alert('You can compare a maximum of 3 properties.');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  const executeCompare = async () => {
    if (compareIds.length < 2) {
      alert('Select at least 2 properties to compare.');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/predictions/compare/`, { ids: compareIds });
      setCompareResults(res.data);
      setShowCompareModal(true);
    } catch (e) {
      alert('Comparison failed.');
    }
  };

  const markNotificationsRead = async () => {
    try {
      await axios.post(`${API_URL}/notifications/mark_all_read/`);
      fetchNotifications();
    } catch (e) {
      console.log(e);
    }
  };

  // -------------------------------------------------------------------------
  // ADMIN DASHBOARD ACTIONS
  // -------------------------------------------------------------------------
  const triggerRetraining = async () => {
    setRetraining(true);
    try {
      await axios.post(`${API_URL}/admin/retrain/`);
      alert('Model retraining initiated successfully in background.');
      fetchNotifications();
    } catch (e) {
      alert('Retraining trigger failed.');
    } finally {
      setRetraining(false);
    }
  };

  const handleAdminCsvUpload = async (e) => {
    e.preventDefault();
    if (!adminCsvFile) return;
    setUploadProgress('Uploading...');
    
    const formData = new FormData();
    formData.append('file', adminCsvFile);
    
    try {
      await axios.post(`${API_URL}/admin/upload-dataset/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadProgress('Dataset Uploaded. Retraining Started!');
      setAdminCsvFile(null);
      setTimeout(() => setUploadProgress(''), 4000);
    } catch (e) {
      setUploadProgress('Upload failed.');
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await axios.patch(`${API_URL}/admin/users/${userId}/`, { role: newRole });
      fetchAdminData();
    } catch (e) {
      alert('Failed to update user role.');
    }
  };

  // Helper formatting for currency
  const formatPrice = (lakhs) => {
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Crore`;
    }
    return `₹${lakhs.toFixed(2)} Lakhs`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-brand-primary animate-spin" />
          <p className="text-sm font-semibold tracking-wider glow-text">LOADING PLATFORM SYSTEM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-between">
      
      {/* -------------------------------------------------------------------------
         HEADER / NAVIGATION BAR
         ------------------------------------------------------------------------- */}
      <header className="sticky top-0 z-[2000] w-full border-b border-slate-800/80 bg-[#0B0F19]/85 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab(user ? 'dashboard' : 'landing')}>
          <Building className="w-8 h-8 text-brand-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white inline-block">AESTATE<span className="text-brand-primary">.AI</span></h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Real Estate Intelligence</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-1.5">
          {user && (
            <>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/25' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}
              >
                Prediction Map
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'analytics' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/25' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}
              >
                Analytics Hub
              </button>
              <button 
                onClick={() => setActiveTab('favorites')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'favorites' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/25' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}
              >
                Saved & Compare
              </button>
              {user.role === 'ADMIN' && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'admin' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/25' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}
                >
                  Admin Panel
                </button>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 relative">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifDropdown(!showNotifDropdown);
                    if (!showNotifDropdown) markNotificationsRead();
                  }}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-all border border-slate-700/50 relative"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[8px] w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifDropdown && (
                  <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-[9999] flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1">
                      <p className="text-xs font-bold text-slate-200">Alert Center</p>
                      <button onClick={() => setShowNotifDropdown(false)} className="text-[10px] text-slate-500 hover:text-white">Close</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No recent system notifications.</p>
                      ) : (
                        notifications.map((notif, idx) => (
                          <div key={idx} className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${notif.type === 'SUCCESS' ? 'bg-emerald-500/5 border-emerald-500/15' : (notif.type === 'WARNING' ? 'bg-red-500/5 border-red-500/15' : 'bg-slate-800/40 border-slate-850')}`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${notif.type === 'SUCCESS' ? 'text-emerald-400' : (notif.type === 'WARNING' ? 'text-red-400' : 'text-brand-primary')}`}>{notif.title}</span>
                              <span className="text-[9px] text-slate-500">{new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-4">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profiling info */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-bold text-xs">
                  {user.first_name?.[0] || user.username[0].toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">{user.first_name} {user.last_name || user.username}</span>
                  <span className="text-[9px] font-bold text-brand-primary tracking-wider uppercase">{user.role === 'ADMIN' ? 'System Administrator' : 'Platform Member'}</span>
                </div>
              </div>

              <button 
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="px-5 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              Sign In to Platform
            </button>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------------------------
         MAIN TABS VISUALS
         ------------------------------------------------------------------------- */}
      <main className="flex-1 w-full px-6 py-8">
        
        {/* LANDING TAB */}
        {activeTab === 'landing' && (
          <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-12 md:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/25 rounded-full text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-6">
              <Activity className="w-3.5 h-3.5" /> Core Features: GIS & Explanatory AI
            </div>
            
            <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mb-6">
              AI-Powered House Price Prediction & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400 glow-text">Real Estate Analytics</span>
            </h2>
            
            <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed mb-10">
              Instantly value residential properties using geospatial coordinate analysis, convolutional neural networks for visual condition audits, and SHAP explainable models. Fit projections and download detailed PDF evaluations.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <button 
                onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                className="px-6 py-3.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Create Free Account
              </button>
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700/60 cursor-pointer"
              >
                Access Prediction Sandbox
              </button>
            </div>

            {/* Visual Specs / Features Deck */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
              <div className="glass-panel p-6 rounded-xl text-left flex flex-col gap-3">
                <MapPin className="w-8 h-8 text-brand-primary" />
                <h3 className="text-base font-bold text-slate-100">GIS Coordinates Heatmap</h3>
                <p className="text-xs text-slate-400 leading-5">Identify pricing hot-zones dynamically using Leaflet. Calculate distances to transit nodes, schools, parks and hospital utilities.</p>
              </div>
              <div className="glass-panel p-6 rounded-xl text-left flex flex-col gap-3">
                <Sliders className="w-8 h-8 text-brand-success" />
                <h3 className="text-base font-bold text-slate-100">Explanatory SHAP Charts</h3>
                <p className="text-xs text-slate-400 leading-5">Understand how square footage, bedrooms, balconies, and age weigh positively or negatively on the final valuation using SHAP values.</p>
              </div>
              <div className="glass-panel p-6 rounded-xl text-left flex flex-col gap-3">
                <TrendingUp className="w-8 h-8 text-brand-warning" />
                <h3 className="text-base font-bold text-slate-100">Appreciation Projections</h3>
                <p className="text-xs text-slate-400 leading-5">Fit time-series linear regressions on localized neighborhood index databases to forecast future values (1 year and 3 years out).</p>
              </div>
            </div>
          </div>
        )}

        {/* PREDICTOR MAP DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            
            {/* Left Column: Form Info */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Property Valuation Parameters</h2>
                  <p className="text-[11px] text-slate-400">Click coordinates on the map or edit settings manually</p>
                </div>
                
                <form onSubmit={handlePredictSubmit} className="flex flex-col gap-4">
                  
                  {/* City and Area Selection */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-semibold">Select City</label>
                      <select 
                        value={selectedCityKey} 
                        onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-brand-primary font-semibold"
                      >
                        {Object.entries(CITIES_DATA).map(([key, city]) => (
                          <option key={key} value={key}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-semibold">Select Area</label>
                      <select 
                        value={selectedAreaKey} 
                        onChange={(e) => handleAreaChange(e.target.value)}
                        className="w-full bg-slate-905 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-brand-primary font-semibold"
                      >
                        {CITIES_DATA[selectedCityKey].areas.map((area) => (
                          <option key={area.name} value={area.name}>{area.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Coords */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Latitude</label>
                      <input 
                        type="number" step="any" value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Longitude</label>
                      <input 
                        type="number" step="any" value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Area (Sq. Ft.)</label>
                      <input 
                        type="number" value={areaSqft} onChange={(e) => setAreaSqft(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Property Type</label>
                      <select 
                        value={propertyType} onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-brand-primary"
                      >
                        <option value="APARTMENT">Apartment</option>
                        <option value="HOUSE">Individual House</option>
                        <option value="CONDO">Condominium</option>
                        <option value="VILLA">Luxury Villa</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Bedrooms</label>
                      <input 
                        type="number" value={bedrooms} onChange={(e) => setBedrooms(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Bathrooms</label>
                      <input 
                        type="number" value={bathrooms} onChange={(e) => setBathrooms(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Floors</label>
                      <input 
                        type="number" value={floors} onChange={(e) => setFloors(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Age (Years)</label>
                      <input 
                        type="number" value={houseAge} onChange={(e) => setHouseAge(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Balconies</label>
                      <input 
                        type="number" value={balconies} onChange={(e) => setBalconies(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-6">
                      <input 
                        type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)}
                        className="w-4 h-4 bg-slate-900 border border-slate-800 rounded accent-brand-primary"
                        id="parking_check"
                      />
                      <label htmlFor="parking_check" className="text-slate-400 cursor-pointer">Parking</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Furnishing Status</label>
                      <select 
                        value={furnishing} onChange={(e) => setFurnishing(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                      >
                        <option value="UNFURNISHED">Unfurnished</option>
                        <option value="SEMI_FURNISHED">Semi-Furnished</option>
                        <option value="FULLY_FURNISHED">Fully Furnished</option>
                      </select>
                    </div>
                  </div>

                  {/* Drag-and-drop Image Upload */}
                  <div className="text-xs">
                    <label className="text-slate-400 block mb-1.5">Property Image (for CV visual condition analysis)</label>
                    <div className="border border-dashed border-slate-800 rounded-lg p-4 bg-slate-900/40 text-center flex flex-col items-center justify-center gap-2 hover:border-brand-primary transition-all relative">
                      <input 
                        type="file" accept="image/*" onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {imagePreview ? (
                        <div className="flex items-center gap-3">
                          <img src={imagePreview} className="w-14 h-10 object-cover rounded border border-slate-700" alt="property" />
                          <div className="text-left">
                            <p className="font-semibold text-slate-200 truncate w-32">{imageFile.name}</p>
                            <p className="text-[10px] text-slate-500">{(imageFile.size/1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                          <p className="text-slate-500 text-[10px]">Drag and drop image or click to browse</p>
                        </>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={predicting}
                    className="w-full py-3 bg-brand-primary hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {predicting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing and Valuing...
                      </>
                    ) : (
                      <>
                        <Sliders className="w-4 h-4" />
                        Run AI Prediction Valuation
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Center/Right: Map + Prediction Output */}
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Quick Area Selector Pills */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                <span className="text-slate-400 font-bold">Quick Area Selection:</span>
                {CITIES_DATA[selectedCityKey].areas.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handleAreaChange(area.name)}
                    className={`px-3 py-1 rounded-full font-semibold transition-all hover:bg-brand-primary/20 ${selectedAreaKey === area.name ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/45' : 'bg-slate-800/50 text-slate-350 border border-slate-700/50'}`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>

              {isLocationSelected ? (
                /* Confirmed location view (Map Evaporated) */
                <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center text-center gap-5 border border-emerald-500/20 bg-gradient-to-b from-[#0F172A]/70 to-[#0B0F19]/90 shadow-2xl min-h-[300px] transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">Property Location Confirmed</h3>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Neighborhood: <span className="text-brand-primary font-bold">{selectedAreaKey}</span> ({CITIES_DATA[selectedCityKey].name})
                    </p>
                    <div className="flex gap-5 justify-center mt-4 text-xs font-mono text-slate-500 bg-slate-900/60 px-4 py-2 rounded-lg border border-slate-850">
                      <span>Lat: {latitude.toFixed(5)}</span>
                      <span>Lng: {longitude.toFixed(5)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationSelected(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 text-xs font-bold rounded-lg cursor-pointer transition-all hover:border-slate-600 flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                    Change Location / Show Map
                  </button>
                </div>
              ) : (
                /* Map view */
                <div className="h-[450px] w-full relative">
                  <MapSelector 
                    selectedLocation={[latitude, longitude]} 
                    onLocationSelect={handleLocationSelect} 
                    heatmapData={heatmapPoints}
                    showHeatmap={showHeatmap}
                    areas={CITIES_DATA[selectedCityKey].areas}
                  />
                  
                  <button 
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 px-4 py-2.5 rounded-lg z-[1000] text-xs font-bold transition-all hover:bg-slate-850 flex items-center gap-2 cursor-pointer shadow-lg text-slate-200"
                  >
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    {showHeatmap ? 'Hide Price Heatmap' : 'Show Price Heatmap'}
                  </button>
                </div>
              )}
              
              {/* Prediction Output Section */}
              {predictionResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Predicted Valuation Banner */}
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-brand-primary flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Valuation Estimate</span>
                      <h2 className="text-3xl font-extrabold text-brand-success mt-1">{formatPrice(predictionResult.predicted_price)}</h2>
                      
                      <div className="flex items-center gap-3 mt-4 text-xs">
                        <div className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-400">
                          Min: <span className="font-semibold text-slate-200">₹{predictionResult.price_range_min}L</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-400">
                          Max: <span className="font-semibold text-slate-200">₹{predictionResult.price_range_max}L</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Confidence:</span>
                        <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-brand-primary h-full rounded-full" style={{width: `${predictionResult.confidence_score}%`}}></div>
                        </div>
                        <span className="font-semibold text-slate-200">{predictionResult.confidence_score}%</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-5 pt-3 border-t border-slate-800">
                      <button 
                        onClick={() => toggleFavorite(predictionResult.id)}
                        className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 ${favorites.some(f => f.prediction === predictionResult.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        {favorites.some(f => f.prediction === predictionResult.id) ? 'Saved' : 'Save Property'}
                      </button>
                      <a 
                        href={`${API_URL}/predictions/${predictionResult.id}/export_pdf/`}
                        target="_blank" rel="noreferrer"
                        className="px-3.5 py-2.5 bg-brand-primary hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF report
                      </a>
                    </div>
                  </div>

                  {/* Keras CV Condition Diagnostic Card */}
                  {predictionResult.visual_condition && (
                    <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Keras CV Condition Diagnostics</span>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-primary text-sm font-bold flex items-center gap-1.5">
                            <Building className="w-4 h-4" />
                            {predictionResult.visual_condition}
                          </div>
                          <span className="text-xs text-slate-400">Confidence: {intPct(predictionResult.cv_confidence)}%</span>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                          <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                            <span className="text-slate-500 text-[10px] block mb-0.5">Brightness</span>
                            <span className="font-semibold text-slate-200">{predictionResult.cv_metrics?.brightness || 72}%</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                            <span className="text-slate-500 text-[10px] block mb-0.5">Saturation</span>
                            <span className="font-semibold text-slate-200">{predictionResult.cv_metrics?.saturation || 45}%</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                            <span className="text-slate-500 text-[10px] block mb-0.5">Edge Polish</span>
                            <span className="font-semibold text-slate-200">{predictionResult.cv_metrics?.edge_density || 12.8}%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">Visual parameters are parsed using OpenCV filters and normalized as layers in Keras.</p>
                    </div>
                  )}

                  {/* SHAP Factors card */}
                  {predictionResult.shap_explanation && (
                    <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">SHAP Explainability Influences</h3>
                        <p className="text-[10px] text-slate-500">Calculates impact weights of property specifications on overall pricing</p>
                      </div>
                      
                      <div className="flex flex-col gap-2.5">
                        {Object.entries(predictionResult.shap_explanation).slice(0, 5).map(([key, val], idx) => {
                          const val_pct = val * 100;
                          return (
                            <div key={idx} className="text-xs flex items-center gap-2">
                              <span className="w-28 text-slate-400 capitalize truncate">{key.replace('distance_', 'Near ').replace('_sqft', '')}</span>
                              <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden flex">
                                {val > 0 ? (
                                  <>
                                    <div className="w-1/2"></div>
                                    <div className="bg-emerald-500 h-full" style={{width: `${Math.min(50, val_pct)}%`}}></div>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-1/2 flex justify-end">
                                      <div className="bg-red-500 h-full" style={{width: `${Math.min(50, Math.abs(val_pct))}%`}}></div>
                                    </div>
                                    <div className="w-1/2"></div>
                                  </>
                                )}
                              </div>
                              <span className={`w-12 text-right font-semibold ${val > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {val > 0 ? '+' : ''}{val_pct.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Forecast Line Plot representation & Investment Verdict */}
                  {predictionResult.forecast && (
                    <div className="glass-panel rounded-xl p-5 flex flex-col justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Price Appreciation Projections</h3>
                        <p className="text-[10px] text-slate-500">Calculates linear regression trends on coordinate sector price indices</p>
                        
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-900 border border-slate-850 p-2.5 rounded flex items-center justify-between">
                            <span className="text-slate-400">+1 Yr Forecast:</span>
                            <span className="font-bold text-slate-200">₹{predictionResult.price_forecast_1yr ? predictionResult.price_forecast_1yr.toFixed(2) : predictionResult.forecast.price_1yr}L</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-2.5 rounded flex items-center justify-between">
                            <span className="text-slate-400">+3 Yr Forecast:</span>
                            <span className="font-bold text-slate-200">₹{predictionResult.price_forecast_3yr ? predictionResult.price_forecast_3yr.toFixed(2) : predictionResult.forecast.price_3yr}L</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Investment Card */}
                      {predictionResult.investment_recommendation && (
                        <div className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${predictionResult.investment_recommendation.includes('Buy') ? 'bg-emerald-500/5 border-emerald-500/10' : (predictionResult.investment_recommendation.includes('Avoid') ? 'bg-red-500/5 border-red-500/10' : 'bg-amber-500/5 border-amber-500/10')}`}>
                          <CheckCircle className={`w-5 h-5 flex-shrink-0 ${predictionResult.investment_recommendation.includes('Buy') ? 'text-emerald-400' : (predictionResult.investment_recommendation.includes('Avoid') ? 'text-red-400' : 'text-amber-400')}`} />
                          <div>
                            <span className="font-bold block mb-0.5">Investment Verdict: {predictionResult.investment_recommendation}</span>
                            <p className="text-[11px] text-slate-400 leading-4">{predictionResult.investment_description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

        {/* ANALYTICS HUB TAB */}
        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold text-white">Market Intelligence Analytics</h2>
              <p className="text-xs text-slate-400">Detailed diagnostic breakdowns and training run statistics</p>
            </div>
            <AnalyticsCharts predictionsData={predictionHistory} stats={adminStats} />
          </div>
        )}

        {/* SAVED PROPERTIES & COMPARE TAB */}
        {activeTab === 'favorites' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Saved Property Estimations</h2>
                <p className="text-xs text-slate-400">Checkbox properties to compare their diagnostics side-by-side (max 3)</p>
              </div>
              
              {compareIds.length >= 2 && (
                <button 
                  onClick={executeCompare}
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sliders className="w-4 h-4" />
                  Compare {compareIds.length} Properties
                </button>
              )}
            </div>

            {predictionHistory.length === 0 ? (
              <div className="text-center py-16 bg-[#0B0F19]">
                <Heart className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-sm font-semibold mb-2">No valuation history found</p>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">Valuate a property on the Prediction Map to save records and compare them.</p>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700/60"
                >
                  Go to Map Predictor
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {predictionHistory.map((pred, idx) => (
                  <div key={idx} className="glass-panel rounded-xl p-4 flex flex-col gap-4 border border-slate-800/80 hover:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" checked={compareIds.includes(pred.id)} onChange={() => handleCompareCheckbox(pred.id)}
                          className="w-4 h-4 bg-slate-900 border border-slate-800 rounded accent-brand-primary cursor-pointer"
                        />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{pred.property_type ? pred.property_type.replace('_', ' ') : 'Property'}</span>
                      </div>
                      
                      <button 
                        onClick={() => toggleFavorite(pred.id)}
                        className="text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Heart className={`w-4.5 h-4.5 ${favorites.some(f => f.prediction === pred.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                    </div>
                    
                    <div>
                      <h4 className="text-xl font-bold text-brand-success">{formatPrice(pred.predicted_price)}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[11px] text-slate-400">{pred.area_sqft} sqft | {pred.bedrooms} BHK | {pred.house_age} yrs old</p>
                        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono">
                          📍 {pred.latitude && pred.longitude ? `${parseFloat(pred.latitude).toFixed(3)}, ${parseFloat(pred.longitude).toFixed(3)}` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div className="bg-slate-900/40 p-1.5 rounded border border-slate-850">
                        <span>Condition:</span>
                        <span className="font-bold text-slate-200 block mt-0.5">{pred.visual_condition || 'Standard'}</span>
                      </div>
                      <div className="bg-slate-900/40 p-1.5 rounded border border-slate-850">
                        <span>Verdict:</span>
                        <span className={`font-bold block mt-0.5 ${pred.investment_recommendation?.includes('Buy') ? 'text-emerald-400' : (pred.investment_recommendation?.includes('Avoid') ? 'text-red-400' : 'text-amber-400')}`}>{pred.investment_recommendation || 'Neutral'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-850 text-xs">
                      <a 
                        href={`${API_URL}/predictions/${pred.id}/export_pdf/`}
                        target="_blank" rel="noreferrer"
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-center flex items-center justify-center gap-1.5 border border-slate-700/50"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                      <button 
                        onClick={() => deletePrediction(pred.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADMIN CONTROL PANEL TAB */}
        {activeTab === 'admin' && user?.role === 'ADMIN' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div>
              <h2 className="text-lg font-bold text-white">Administrator Control suite</h2>
              <p className="text-xs text-slate-400">Manage user accounts, upload CSV datasets, and run background model retraining Celery tasks</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* retrain controls */}
              <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">ML Model Retraining Deck</h3>
                  <p className="text-[10px] text-slate-500">Run retraining tasks asynchronously through Celery workers</p>
                </div>
                
                <button 
                  onClick={triggerRetraining}
                  disabled={retraining}
                  className="w-full py-3 bg-brand-primary hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
                  Trigger Asynchronous Retraining
                </button>
                
                {/* Active Model Summary info */}
                {adminStats && (
                  <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 text-xs">
                    <p className="font-semibold text-slate-300">Active Model Metrics:</p>
                    {adminStats.models_metadata?.slice(0,2).map((m, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-850 p-2.5 rounded">
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span>{m.model_name} (v{m.version})</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">Active</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-slate-400">
                          <span>R2: {m.r2_score.toFixed(4)}</span>
                          <span>MAE: {m.mae.toFixed(2)}</span>
                          <span>MSE: {m.mse.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Dataset */}
              <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Upload Property Dataset</h3>
                  <p className="text-[10px] text-slate-500">Upload new CSV dataset files to overwrite default datasets</p>
                </div>
                
                <form onSubmit={handleAdminCsvUpload} className="flex flex-col gap-3">
                  <div className="border border-dashed border-slate-800 rounded-lg p-5 text-center flex flex-col items-center justify-center gap-2 hover:border-brand-primary transition-all relative bg-slate-900/40">
                    <input 
                      type="file" accept=".csv" onChange={(e) => setAdminCsvFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {adminCsvFile ? (
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-brand-primary mx-auto mb-2" />
                        <p className="font-semibold text-slate-200 text-xs truncate w-40">{adminCsvFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(adminCsvFile.size/1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-slate-500 text-xs">Drop training CSV or click to browse</p>
                      </>
                    )}
                  </div>
                  
                  {uploadProgress && (
                    <p className="text-xs font-semibold text-brand-success text-center">{uploadProgress}</p>
                  )}

                  <button 
                    type="submit"
                    disabled={!adminCsvFile}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700/60 disabled:opacity-50 cursor-pointer"
                  >
                    Upload & Retrain
                  </button>
                </form>
              </div>

              {/* User management */}
              <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 lg:col-span-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Role-Based user administration</h3>
                  <p className="text-[10px] text-slate-500">Toggle roles for registered platform members</p>
                </div>
                
                <div className="max-h-60 overflow-y-auto flex flex-col gap-2.5">
                  {adminUsers.map((u, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-850 p-2.5 rounded flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200 block">{u.first_name} {u.last_name || u.username}</span>
                        <span className="text-[10px] text-slate-500">{u.email}</span>
                      </div>
                      
                      <select 
                        value={u.role} onChange={(e) => changeUserRole(u.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-1 text-[10px] focus:outline-none"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* -------------------------------------------------------------------------
         FOOTER
         ------------------------------------------------------------------------- */}
      <footer className="border-t border-slate-850 bg-[#0B0F19] text-center py-6 text-[10px] text-slate-650 tracking-wider uppercase">
        &copy; {new Date().getFullYear()} AEstate.AI Inc. All rights reserved. | Software Engineering Final Year Project Portfolio.
      </footer>

      {/* -------------------------------------------------------------------------
         AUTHENTICATION AUTH MODAL
         ------------------------------------------------------------------------- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-all text-xs"
            >
              Cancel
            </button>
            
            <h2 className="text-xl font-extrabold text-white mb-1">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-[11px] text-slate-400 mb-5">
              {authMode === 'login' ? 'Sign in to valuate and compare properties.' : 'Create credentials to start forecasting.'}
            </p>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/25 p-2.5 rounded-lg text-[11px] text-red-400 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-lg text-[11px] text-emerald-400 mb-4 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name</label>
                    <input 
                      type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-primary"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Email Address</label>
                    <input 
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-primary"
                      placeholder="jane@example.com"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Username</label>
                <input 
                  type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-primary"
                  placeholder="janedoe"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Password</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-primary"
                  placeholder="••••••••"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="text-slate-400 block mb-1">Confirm Password</label>
                  <input 
                    type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-primary"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button 
                type="submit"
                disabled={authSubmitting}
                className={`w-full py-2.5 bg-brand-primary hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer ${authSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {authSubmitting ? 'Processing...' : (authMode === 'login' ? 'Please Sign In' : 'Register Profile')}
              </button>
            </form>
            
            <div className="text-center mt-5 pt-3 border-t border-slate-850 text-[11px] text-slate-400">
              {authMode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-brand-primary font-bold hover:underline">Sign Up</button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-brand-primary font-bold hover:underline">Sign In</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
         COMPARE PROPERTIES MODAL
         ------------------------------------------------------------------------- */}
      {showCompareModal && compareResults && (
        <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setShowCompareModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-all text-xs"
            >
              Close
            </button>
            
            <h2 className="text-lg font-bold text-white mb-4">Property Side-by-Side Comparison</h2>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs text-slate-350">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-2.5 font-bold text-slate-200">Specification</th>
                    {compareResults.map((p, i) => (
                      <th key={i} className="py-2.5 font-bold text-brand-primary text-sm">Property #{p.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Predicted Price</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5 font-bold text-brand-success">{formatPrice(p.predicted_price)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Property Type</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5 capitalize">{p.property_type.toLowerCase()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Area (Sqft)</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5 font-bold text-slate-200">{p.area_sqft} sqft</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Rooms Configuration</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5">{p.bedrooms} BHK / {p.bathrooms} Bath</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Age & Balconies</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5">{p.house_age} yrs / {p.balcony_count} balconies</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Visual Condition (CV)</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-semibold text-[10px]">
                          {p.visual_condition || 'Standard'}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Nearby Transit Proximity</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5">{p.amenity ? `${p.amenity.distance_transport.toFixed(2)} km` : 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Nearby Schools Proximity</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5">{p.amenity ? `${p.amenity.distance_school.toFixed(2)} km` : 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">1-Year Appreciated Forecast</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5 font-bold text-slate-200">₹{p.price_forecast_1yr ? p.price_forecast_1yr.toFixed(2) : 'N/A'} Lakhs</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">3-Year Appreciated Forecast</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5 font-bold text-slate-200">₹{p.price_forecast_3yr ? p.price_forecast_3yr.toFixed(2) : 'N/A'} Lakhs</td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="py-2.5 font-semibold text-slate-400">Investment Recommendation</td>
                    {compareResults.map((p, i) => (
                      <td key={i} className="py-2.5">
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${p.investment_recommendation?.includes('Buy') ? 'bg-emerald-500/10 text-emerald-400' : (p.investment_recommendation?.includes('Avoid') ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400')}`}>
                          {p.investment_recommendation || 'Neutral'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Convert confidence/probabilities safely to percentages
function intPct(val) {
  if (!val) return 0;
  return Math.round(val * 100);
}
